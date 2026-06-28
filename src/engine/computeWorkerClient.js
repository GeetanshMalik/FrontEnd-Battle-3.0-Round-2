import { on, emit } from './eventBus.js';
import { stateEngine } from './stateEngine.js';
import { transitionTo, StreamStates } from './streamStateMachine.js';
import { attemptRecovery } from '../utils/errorRecovery.js';

let worker = null;
let isInitialized = false;
let stateUpdatedUnsub = null;
let batchReceivedUnsub = null;

// Store state of computed rows
let latestRows = [];
const listeners = new Set();

// Trigger store subscriptions
const notifyListeners = () => {
  listeners.forEach(fn => fn());
};

export const terminateWorkerDebug = () => {
  if (worker) {
    console.warn('[ComputeWorkerClient] Debug triggering manual worker crash...');
    worker.terminate();
    worker = null;
    isInitialized = false;
    emit('WORKER_STATUS_CHANGED', 'Crashed');
    transitionTo(StreamStates.ERROR);
    attemptRecovery();
  }
};

export const initializeWorker = () => {
  if (worker) return;

  // Unsubscribe old listeners if they exist to prevent duplicate event listener leak
  if (stateUpdatedUnsub) stateUpdatedUnsub();
  if (batchReceivedUnsub) batchReceivedUnsub();

  console.log('[ComputeWorkerClient] Spawning Web Worker thread...');
  
  worker = new Worker(
    new URL('../workers/computeWorker.js', import.meta.url),
    { type: 'module' }
  );

  emit('WORKER_STATUS_CHANGED', 'Healthy');

  worker.onerror = (err) => {
    console.error('[ComputeWorkerClient] Web Worker thread crashed:', err);
    worker = null;
    isInitialized = false;
    emit('WORKER_STATUS_CHANGED', 'Crashed');
    transitionTo(StreamStates.ERROR);
    attemptRecovery();
  };

  // Listen for worker messages
  worker.onmessage = (event) => {
    const { type, payload } = event.data;

    if (type === 'RESULTS') {
      const { visibleRows } = payload;
      
      // Store new reference
      latestRows = visibleRows;
      notifyListeners();
      
      // Dispatch on global event bus (Feature 8 connector)
      emit('WORKER_RESULT', { visibleRows });
    } else if (type === 'EXPORT_RESPONSE') {
      const { csvString } = payload;
      emit('EXPORT_COMPLETE', { csvString });
    }
  };

  // Wire initial bulk load
  stateUpdatedUnsub = on('STATE_UPDATED', () => {
    if (!isInitialized && stateEngine.getSize() > 0) {
      isInitialized = true;
      const fullPool = stateEngine.getRows();
      
      worker.postMessage({
        type: 'INIT',
        payload: { fullPool }
      });
    }
  });

  // Wire stream updates
  batchReceivedUnsub = on('BATCH_RECEIVED', (batch) => {
    if (isInitialized && batch && batch.length > 0) {
      worker.postMessage({
        type: 'PATCH',
        payload: { batch }
      });
    }
  });
};

// Store Bindings for React useSyncExternalStore
export const computeWorkerClient = {
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  getSnapshot() {
    return latestRows;
  },

  // UI Dispatchers
  updateFilters(filters) {
    if (!worker) return;
    worker.postMessage({
      type: 'FILTER_CHANGE',
      payload: { filters }
    });
  },

  updateSearch(query) {
    if (!worker) return;
    worker.postMessage({
      type: 'SEARCH_CHANGE',
      payload: { query }
    });
  },

  updateSort(sortKeys) {
    if (!worker) return;
    worker.postMessage({
      type: 'SORT_CHANGE',
      payload: { sortKeys }
    });
  },

  requestExport() {
    if (!worker) return;
    worker.postMessage({ type: 'EXPORT_REQUEST' });
  }
};

/** Stream Bridge connecting the raw telemetry hook to the Event Bus and State Machine. */

import { emit, on } from './eventBus.js';
import { transitionTo, getCurrentState, StreamStates } from './streamStateMachine.js';
import { stateEngine } from './stateEngine.js';
import { enqueueRows, flushQueue } from './pauseQueue.js';

let csvPath = './automation_projects.csv';

// Custom helper to parse CSV similarly to dataStream.js
const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].includes('\t')
    ? lines[0].split('\t').map(h => h.trim())
    : lines[0].split(',').map(h => h.trim());
  
  const parsedData = [];
  const size = lines.length;
  
  for (let i = 1; i < size; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.includes('\t') ? line.split('\t') : line.split(',');
    
    if (values.length === headers.length) {
      const rowObject = { internal_uid: `uid-row-${i}` };
      const headerCount = headers.length;
      for (let j = 0; j < headerCount; j++) {
        rowObject[headers[j]] = values[j].trim();
      }
      parsedData.push(rowObject);
    }
  }
  return parsedData;
};

// Initializes the stream connection
export const initializeStream = async (targetCsvPath = './automation_projects.csv', isRecovery = false) => {
  csvPath = targetCsvPath;
  
  if (!isRecovery && getCurrentState() !== StreamStates.INITIALIZING) {
    console.warn('[StreamBridge] Already initialized or loading.');
    return;
  }

  try {
    if (!isRecovery) {
      transitionTo(StreamStates.LOADING);
    }
    
    console.log(`[StreamBridge] Pre-fetching CSV to build initial state pool: ${csvPath}`);
    const response = await fetch(csvPath);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.statusText}`);
    }
    
    const text = await response.text();
    const initialRows = parseCSV(text);
    console.log(`[StreamBridge] Parsed ${initialRows.length} initial rows. Upserting into State Engine...`);
    
    stateEngine.upsert(initialRows);
    
    if (!isRecovery) {
      console.log('[StreamBridge] Initial pool loaded. Connecting to telemetry firehose...');
      // Wire the firehose callback
      window.initializeRpaStream((incomingBatch) => {
        const state = getCurrentState();
        
        if (state === StreamStates.PAUSED) {
          // Queue rows during PAUSED state
          enqueueRows(incomingBatch);
          // Emit an event so UI can display the current buffer length
          emit('STREAM_STATE_CHANGED', { oldState: state, newState: state });
        } else if (state === StreamStates.STREAMING || state === StreamStates.RESUMING) {
          // Standard path: upsert to stateEngine and notify metricsEngine
          stateEngine.upsert(incomingBatch);
          emit('BATCH_RECEIVED', incomingBatch);
        }
      }, csvPath);
    }

    transitionTo(StreamStates.STREAMING);

  } catch (err) {
    console.error('[StreamBridge] Crash during initialization:', err);
    transitionTo(StreamStates.ERROR);
  }
};

// Listen for state machine transitions
on('STREAM_STATE_CHANGED', ({ newState }) => {
  if (newState === StreamStates.RESUMING) {
    // Flush PauseQueue sequence-safely
    flushQueue();
    // Revert back to STREAMING
    transitionTo(StreamStates.STREAMING);
  }
});

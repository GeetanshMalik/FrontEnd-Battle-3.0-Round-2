/** Sequence-safe Pause Queue for buffering incoming telemetry rows during PAUSED states. */

import { stateEngine } from './stateEngine.js';
import { emit } from './eventBus.js';

let pendingQueue = [];
const FLUSH_CHUNK_SIZE = 500;

// Add rows to the buffer queue
export const enqueueRows = (rows) => {
  pendingQueue.push(...rows);
};

// Get current length of the buffered queue
export const getQueueLength = () => pendingQueue.length;

// Clear the buffer
export const clearQueue = () => {
  pendingQueue = [];
};

// Drain the buffer and upsert to stateEngine in chunks
export const flushQueue = () => {
  if (pendingQueue.length === 0) return;
  
  console.log(`[PauseQueue] Draining ${pendingQueue.length} buffered rows...`);
  
  while (pendingQueue.length > 0) {
    const chunk = pendingQueue.splice(0, FLUSH_CHUNK_SIZE);
    stateEngine.upsert(chunk);
    emit('BATCH_RECEIVED', chunk);
  }
};

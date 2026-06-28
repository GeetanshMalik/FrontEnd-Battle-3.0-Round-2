/** Feature 19: Error Recovery and stream retry coordinator. */

import { transitionTo, getCurrentState, StreamStates } from '../engine/streamStateMachine.js';
import { initializeStream } from '../engine/streamBridge.js';
import { metricsEngine } from '../engine/metricsEngine.js';
import { stateEngine } from '../engine/stateEngine.js';
import { initializeWorker } from '../engine/computeWorkerClient.js';

let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export const attemptRecovery = () => {
  const state = getCurrentState();
  if (state !== StreamStates.ERROR) return;

  if (retryCount >= MAX_RETRIES) {
    console.error('[ErrorRecovery] Max retry limit reached. Telemetry stream connection lost permanently.');
    return;
  }

  retryCount++;
  console.warn(`[ErrorRecovery] Initiating connection recovery attempt ${retryCount}/${MAX_RETRIES} in ${RETRY_DELAY_MS}ms...`);

  setTimeout(async () => {
    try {
      // 1. Transition back to LOADING
      transitionTo(StreamStates.LOADING);
      
      // 2. Clear state pools to prevent duplicate data conflicts
      stateEngine.clear();
      metricsEngine.reset();

      // Spawn worker thread anew
      initializeWorker();

      // 3. Attempt re-initialization
      await initializeStream('./automation_projects.csv', true);
      
      // Reset retry count on success
      retryCount = 0;
      console.log('[ErrorRecovery] Recovery connection successful.');
    } catch (err) {
      console.error('[ErrorRecovery] Recovery retry attempt failed:', err);
      transitionTo(StreamStates.ERROR);
    }
  }, RETRY_DELAY_MS);
};

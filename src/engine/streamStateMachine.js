/** Stream lifecycle State Machine managing telemetry stream states and state transitions. */

import { emit } from './eventBus.js';

export const StreamStates = {
  INITIALIZING: 'INITIALIZING',
  LOADING: 'LOADING',
  STREAMING: 'STREAMING',
  PAUSED: 'PAUSED',
  RESUMING: 'RESUMING',
  ERROR: 'ERROR'
};

let currentState = StreamStates.INITIALIZING;

// Get current state
export const getCurrentState = () => currentState;

// Transition to a new state and emit transition event
export const transitionTo = (newState) => {
  if (!StreamStates[newState]) {
    console.error(`[StateMachine] Invalid state transition target: ${newState}`);
    return;
  }
  
  const oldState = currentState;
  if (oldState === newState) return;

  // Enforce validity of certain transitions if needed
  // e.g., STREAMING -> PAUSED is valid, PAUSED -> RESUMING is valid, RESUMING -> STREAMING is valid.
  currentState = newState;
  console.log(`[StateMachine] Transitioned: ${oldState} -> ${newState}`);
  emit('STREAM_STATE_CHANGED', { oldState, newState });
};

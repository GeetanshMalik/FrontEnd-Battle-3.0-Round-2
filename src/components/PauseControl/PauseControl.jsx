/** Feature 5: Pipeline Pause/Play control button displaying buffered queue count. */

import React, { useCallback, useSyncExternalStore } from 'react';
import { on } from '../../engine/eventBus.js';
import { getCurrentState, transitionTo, StreamStates } from '../../engine/streamStateMachine.js';
import { getQueueLength } from '../../engine/pauseQueue.js';
import '../../styles/pause.css';

export const PauseControl = React.memo(() => {
  // Subscribe to stream state and queue length changes
  const subscribe = useCallback((callback) => {
    return on('STREAM_STATE_CHANGED', callback);
  }, []);

  // Composite snapshot containing both state and queue length to trigger React update on buffer changes
  const getSnapshot = useCallback(() => {
    return `${getCurrentState()}-${getQueueLength()}`;
  }, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const [state, queueLengthStr] = snapshot.split('-');
  const queueLength = parseInt(queueLengthStr, 10);

  const togglePause = () => {
    if (state === StreamStates.STREAMING) {
      transitionTo(StreamStates.PAUSED);
    } else if (state === StreamStates.PAUSED) {
      transitionTo(StreamStates.RESUMING);
    }
  };

  const isPaused = state === StreamStates.PAUSED;

  return (
    <div className="pause-control-container">
      <button 
        className={`pause-btn ${isPaused ? 'btn-paused' : 'btn-streaming'}`}
        onClick={togglePause}
        aria-label={isPaused ? 'Resume telemetry pipeline' : 'Pause telemetry pipeline'}
      >
        <span className="btn-icon">{isPaused ? '▶' : '⏸'}</span>
        <span className="btn-text">{isPaused ? 'Resume' : 'Pause'}</span>
      </button>

      {isPaused && (
        <div className="pause-overlay-badge panel-glass" aria-live="polite">
          <span className="pulse-indicator"></span>
          Buffered: <strong>{queueLength}</strong> rows
        </div>
      )}
    </div>
  );
});

PauseControl.displayName = 'PauseControl';

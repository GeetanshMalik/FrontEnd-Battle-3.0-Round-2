/** Custom high-performance Event Bus with priority-tiered scheduling for state and telemetry events. */

const listeners = {};

// Register listener for a specific event
export const on = (event, fn) => {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(fn);
  return () => off(event, fn); // Returns unsubscribe function
};

// Remove listener
export const off = (event, fn) => {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(f => f !== fn);
};

// Determine dispatch priority based on the event type
const getPriority = (event) => {
  if (['BATCH_RECEIVED', 'STREAM_STATE_CHANGED', 'ERROR'].includes(event)) {
    return 'HIGH';
  }
  if (['STATE_UPDATED', 'WORKER_RESULT', 'ALERT_TRIGGERED'].includes(event)) {
    return 'MEDIUM';
  }
  return 'LOW'; // KPI_UPDATED, LAYOUT_CHANGED, performance sampling
};

// Dispatch event with prioritized scheduling
export const emit = (event, payload) => {
  const targets = listeners[event];
  if (!targets || targets.length === 0) return;

  const priority = getPriority(event);

  const executeDispatches = () => {
    // Iterate over a copy of the array to prevent mutation issues during dispatch
    const size = targets.length;
    for (let i = 0; i < size; i++) {
      try {
        targets[i](payload);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event ${event}:`, err);
      }
    }
  };

  if (priority === 'HIGH') {
    // HIGH: synchronous execution
    executeDispatches();
  } else if (priority === 'MEDIUM') {
    // MEDIUM: microtask queue
    queueMicrotask(executeDispatches);
  } else {
    // LOW: requestAnimationFrame (defer to paint cycle)
    requestAnimationFrame(executeDispatches);
  }
};

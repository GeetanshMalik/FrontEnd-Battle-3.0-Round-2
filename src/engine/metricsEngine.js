/** Metrics Engine maintaining running KPI metrics accumulators and ticks history buffer. */

import { on, emit } from './eventBus.js';

let totalRowsProcessed = 0;
let totalRobotsDeployed = 0;
let globalSavings = 0;
let runningProcessedValue = 0;
let isInitialized = false;

// Metrics History buffer (max 100 data points for Canvas rendering)
const MAX_HISTORY = 100;
const savingsHistory = [];
const rowsHistory = [];
const robotsHistory = [];

// Rolling window tracking for "this minute" metrics (last 60s)
const rollingWindow = [];
const WINDOW_DURATION_MS = 60000;
let lastMinuteRows = 0;
let lastMinuteRobots = 0;
let lastMinuteSavings = 0;

// Updates per second throughput velocity
let lastRowsCount = 0;
let rowsPerSecond = 0;

const velocityInterval = setInterval(() => {
  const currentTotal = totalRowsProcessed;
  rowsPerSecond = currentTotal - lastRowsCount;
  lastRowsCount = currentTotal;
}, 1000);

let currentSnapshot = {
  totalRowsProcessed: 0,
  totalRobotsDeployed: 0,
  globalSavings: 0,
  lastMinuteRows: 0,
  lastMinuteRobots: 0,
  lastMinuteSavings: 0,
  rowsPerSecond: 0,
  runningProcessedValue: 0
};

let currentHistorySnapshot = {
  savingsHistory: [],
  rowsHistory: [],
  robotsHistory: []
};

// Export getSnapshot and getHistorySnapshot for useSyncExternalStore compatibility
export const metricsEngine = {
  getSnapshot() {
    return currentSnapshot;
  },

  getHistorySnapshot() {
    return currentHistorySnapshot;
  },

  reset() {
    totalRowsProcessed = 0;
    totalRobotsDeployed = 0;
    globalSavings = 0;
    runningProcessedValue = 0;
    isInitialized = false;
    savingsHistory.length = 0;
    rowsHistory.length = 0;
    robotsHistory.length = 0;
    rollingWindow.length = 0;
    lastMinuteRows = 0;
    lastMinuteRobots = 0;
    lastMinuteSavings = 0;
    lastRowsCount = 0;
    rowsPerSecond = 0;
    
    currentSnapshot = {
      totalRowsProcessed,
      totalRobotsDeployed,
      globalSavings,
      lastMinuteRows,
      lastMinuteRobots,
      lastMinuteSavings,
      rowsPerSecond
    };
    
    currentHistorySnapshot = {
      savingsHistory: [],
      rowsHistory: [],
      robotsHistory: []
    };
    
    emit('KPI_UPDATED', currentSnapshot);
  }
};

// Subscribe to state updates to maintain running KPIs
on('STATE_UPDATED', ({ updatedRows, robotsDelta, savingsDelta }) => {
  if (!isInitialized) {
    // Initial bulk load
    isInitialized = true;
    totalRobotsDeployed = robotsDelta || 0;
    globalSavings = savingsDelta || 0;
    totalRowsProcessed = 0; // Starts at 0 for streamed updates
    runningProcessedValue = 0; // Starts at 0 for session tracking
    lastMinuteRows = 0;
    lastMinuteRobots = 0;
    lastMinuteSavings = 0;
  } else {
    // Stream updates (either live or flushed pause queue)
    totalRobotsDeployed += (robotsDelta || 0);
    globalSavings += (savingsDelta || 0);
    totalRowsProcessed += updatedRows.length;
    
    // Accumulate the savings value of all processed telemetry updates in this session
    let batchSavings = 0;
    const size = updatedRows.length;
    for (let i = 0; i < size; i++) {
      batchSavings += (updatedRows[i].annual_savings_usd || 0);
    }
    runningProcessedValue += batchSavings;
    
    // Add to rolling window for last 60 seconds deltas
    // Add to rolling window for last 60 seconds deltas
    const now = Date.now();
    rollingWindow.push({
      timestamp: now,
      rows: updatedRows.length,
      robots: robotsDelta || 0,
      savings: savingsDelta || 0
    });

    // Evict old ticks outside the 60-second window
    const cutoff = now - WINDOW_DURATION_MS;
    while (rollingWindow.length > 0 && rollingWindow[0].timestamp < cutoff) {
      rollingWindow.shift();
    }

    // Sum deltas in the active 60s window
    let rSum = 0;
    let bSum = 0;
    let sSum = 0;
    const windowSize = rollingWindow.length;
    for (let i = 0; i < windowSize; i++) {
      rSum += rollingWindow[i].rows;
      bSum += rollingWindow[i].robots;
      sSum += rollingWindow[i].savings;
    }
    lastMinuteRows = rSum;
    lastMinuteRobots = bSum;
    lastMinuteSavings = sSum;

    // Append to sliding history buffers for sparklines
    savingsHistory.push(batchSavings);
    rowsHistory.push(totalRowsProcessed);
    robotsHistory.push(totalRobotsDeployed);

    if (savingsHistory.length > MAX_HISTORY) {
      savingsHistory.shift();
      rowsHistory.shift();
      robotsHistory.shift();
    }
  }

  currentSnapshot = {
    totalRowsProcessed,
    totalRobotsDeployed,
    globalSavings,
    lastMinuteRows,
    lastMinuteRobots,
    lastMinuteSavings,
    rowsPerSecond,
    runningProcessedValue
  };

  currentHistorySnapshot = {
    savingsHistory: [...savingsHistory],
    rowsHistory: [...rowsHistory],
    robotsHistory: [...robotsHistory]
  };

  emit('KPI_UPDATED', currentSnapshot);
});

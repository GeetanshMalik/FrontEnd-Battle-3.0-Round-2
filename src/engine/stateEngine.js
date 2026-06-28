/** Central state engine maintaining the O(1) Map-based RPA project records pool. */

import { emit } from './eventBus.js';

// The master pool holding all records. Keyed by internal_uid.
const statePool = new Map();

export const stateEngine = {
  // Upsert a batch of rows into the pool
  upsert(rows) {
    if (!rows || rows.length === 0) return { robotsDelta: 0, savingsDelta: 0 };

    const updatedRows = [];
    let robotsDelta = 0;
    let savingsDelta = 0;
    const isInitialLoad = statePool.size === 0;
    const batchActivities = [];
    
    // Process upserts in a single loop
    const size = rows.length;
    for (let i = 0; i < size; i++) {
      const row = rows[i];
      const uid = row.internal_uid;
      const oldRow = statePool.get(uid);
      
      let robots_deployed = parseInt(row.robots_deployed, 10) || 0;
      let budget_usd = parseInt(row.budget_usd, 10) || 0;
      let annual_savings_usd = parseInt(row.annual_savings_usd, 10) || 0;
      let roi_percent = parseFloat(row.roi_percent) || 0.0;
      let project_status = row.project_status || 'Active';
      let employee_hours_saved = parseInt(row.employee_hours_saved, 10) || 0;

      // Parse baseline telemetry values directly without fluctuations
      if (!isInitialLoad && oldRow) {
        const rand = Math.random();
        let activityType = 'HEARTBEAT';
        let oldVal = '';
        let newVal = '';
        let field = 'Telemetry Ping';

        if (rand > 0.85) {
          // Simulated Status transition for log
          activityType = 'STATUS';
          oldVal = oldRow.project_status || 'Active';
          newVal = oldVal === 'Failed' ? (Math.random() > 0.5 ? 'Active' : 'Completed') : (Math.random() > 0.9 ? 'Failed' : 'Completed');
          field = 'Status';
        } else if (rand > 0.50) {
          // Simulated ROI shift for log
          activityType = 'ROI';
          const currentRoi = oldRow.roi_percent || 0.0;
          const shift = parseFloat((Math.random() * 4.5 - 1.5).toFixed(2));
          oldVal = `${currentRoi.toFixed(2)}%`;
          newVal = `${(currentRoi + shift).toFixed(2)}%`;
          field = 'ROI';
        } else if (rand > 0.25) {
          // Simulated Robots change for log
          activityType = 'ROBOTS';
          const currentRobots = oldRow.robots_deployed || 0;
          const shift = Math.floor(Math.random() * 6) - 1;
          oldVal = String(currentRobots);
          newVal = String(Math.max(1, currentRobots + shift));
          field = 'Robots';
        } else {
          // Simulated Savings change for log
          activityType = 'SAVINGS';
          const currentSavings = oldRow.annual_savings_usd || 0;
          const shift = Math.floor(Math.random() * 24000) - 8000;
          oldVal = String(currentSavings);
          newVal = String(Math.max(0, currentSavings + shift));
          field = 'Savings';
        }

        batchActivities.push({
          project_id: row.project_id || '',
          project_name: row.project_name || '',
          timestamp: new Date(),
          activityType,
          field,
          oldVal,
          newVal
        });
      }

      const sanitized = {
        ...row,
        robots_deployed,
        budget_usd,
        annual_savings_usd,
        roi_percent,
        project_status,
        employee_hours_saved,
        _lastUpdated: !isInitialLoad && oldRow ? Date.now() : undefined
      };

      if (oldRow) {
        robotsDelta += (sanitized.robots_deployed - (oldRow.robots_deployed || 0));
        savingsDelta += (sanitized.annual_savings_usd - (oldRow.annual_savings_usd || 0));
      } else {
        robotsDelta += sanitized.robots_deployed;
        savingsDelta += sanitized.annual_savings_usd;
      }

      statePool.set(uid, sanitized);
      updatedRows.push(sanitized);
    }

    // Prioritize and emit at most 2 activities per batch to avoid spamming the activity feed
    if (batchActivities.length > 0) {
      batchActivities.sort((a, b) => {
        const order = { STATUS: 0, ROI: 1, ROBOTS: 2, SAVINGS: 3, HEARTBEAT: 4 };
        return order[a.activityType] - order[b.activityType];
      });
      const toEmit = batchActivities.slice(0, Math.min(2, batchActivities.length));
      for (let i = 0; i < toEmit.length; i++) {
        emit('ACTIVITY_EVENT', toEmit[i]);
      }
    }

    // Emit event that state is updated, carrying the list of updated rows and calculated deltas
    emit('STATE_UPDATED', { 
      updatedRows, 
      poolSize: statePool.size, 
      robotsDelta, 
      savingsDelta 
    });

    return { robotsDelta, savingsDelta };
  },

  // Get the complete array of rows in the pool
  getRows() {
    return Array.from(statePool.values());
  },

  // Get a specific row
  getRow(uid) {
    return statePool.get(uid);
  },

  // Clear pool
  clear() {
    statePool.clear();
  },

  // Return the raw map size
  getSize() {
    return statePool.size;
  }
};

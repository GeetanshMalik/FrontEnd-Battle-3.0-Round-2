/** Feature 1: Isolated KPI Strip containing total rows processed, active robots, and global savings. */

import React, { useCallback, useSyncExternalStore } from 'react';
import { on } from '../../engine/eventBus.js';
import { metricsEngine } from '../../engine/metricsEngine.js';
import { selectKPIs } from '../../selectors/selectKPIs.js';
import { formatInteger } from '../../utils/formatters.js';
import '../../styles/kpi.css';

export const KPIStrip = React.memo(() => {
  // Subscribe to the metrics engine snapshot updates
  const subscribe = useCallback((callback) => {
    return on('KPI_UPDATED', callback);
  }, []);

  const metricsSnapshot = useSyncExternalStore(
    subscribe,
    metricsEngine.getSnapshot
  );

  const { totalRowsProcessed, totalRobotsDeployed, globalSavings } = selectKPIs(metricsSnapshot);

  // Dynamic Subtitles for Card 2 & 3
  const robotsDelta = metricsSnapshot.lastMinuteRobots || 0;
  const robotsSubtitle = robotsDelta !== 0 
    ? `Δ +${formatInteger(robotsDelta)} this minute` 
    : 'Across 50,000 projects';

  const sessionSavings = metricsSnapshot.runningProcessedValue || 0;
  let savingsSubtitle = 'Portfolio Value';
  if (sessionSavings > 0) {
    if (sessionSavings >= 1000000) {
      savingsSubtitle = `Session Processed: $${(sessionSavings / 1000000).toFixed(1)}M`;
    } else if (sessionSavings >= 1000) {
      savingsSubtitle = `Session Processed: $${Math.round(sessionSavings / 1000)}k`;
    } else {
      savingsSubtitle = `Session Processed: $${sessionSavings}`;
    }
  }

  return (
    <section className="kpi-container" aria-label="RPA Metrics Dashboard">
      {/* Card 1: Total Telemetry Rows */}
      <div className="kpi-card kpi-processed panel-glass">
        <div className="kpi-info-content">
          <h2 className="kpi-label">Total Telemetry Rows</h2>
          <div className="kpi-value">{totalRowsProcessed}</div>
        </div>
        <svg 
          width="44" 
          height="44" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="var(--accent-cyan)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="kpi-card-icon"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>

      {/* Card 2: Robots Deployed */}
      <div className="kpi-card kpi-robots panel-glass">
        <div className="kpi-info-content">
          <h2 className="kpi-label">Robots Deployed</h2>
          <div className="kpi-value">{totalRobotsDeployed}</div>
          <div className="kpi-secondary-metric">{robotsSubtitle}</div>
        </div>
        <svg 
          width="44" 
          height="44" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="var(--accent-success)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="kpi-card-icon"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4M9 16h6M8 14h.01M16 14h.01M6 21v2M18 21v2" />
        </svg>
      </div>

      {/* Card 3: Cumulative Savings */}
      <div className="kpi-card kpi-savings panel-glass">
        <div className="kpi-info-content">
          <h2 className="kpi-label">Cumulative Savings</h2>
          <div className="kpi-value">{globalSavings}</div>
          <div className="kpi-secondary-metric">{savingsSubtitle}</div>
        </div>
        <svg 
          width="44" 
          height="44" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="var(--accent-warning)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="kpi-card-icon"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M15 9H10.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H9" />
        </svg>
      </div>
    </section>
  );
});

KPIStrip.displayName = 'KPIStrip';

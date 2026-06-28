import React, { useEffect, useState, useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { on } from '../../engine/eventBus.js';
import { formatCurrency } from '../../utils/formatters.js';
import { autoRefreshStore } from '../../engine/autoRefreshStore.js';
import '../../styles/activity.css';

export const RecentActivityPanel = React.memo(({ style }) => {
  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [ticker, setTicker] = useState(0);

  // Subscribe to shared auto-refresh toggle store
  const autoRefresh = useSyncExternalStore(
    autoRefreshStore.subscribe,
    autoRefreshStore.get
  );

  // Maintain event listeners reactively
  useEffect(() => {
    const handleEvent = (event) => {
      if (autoRefresh) {
        setEvents(prev => {
          const updated = [event, ...prev];
          return updated.slice(0, 20); // Keep max 20 events for vertical stretch
        });
      } else {
        setPendingEvents(prev => {
          const updated = [event, ...prev];
          return updated.slice(0, 20);
        });
      }
    };

    return on('ACTIVITY_EVENT', handleEvent);
  }, [autoRefresh]);

  // Flush buffer automatically when auto-refresh is toggled ON
  useEffect(() => {
    if (autoRefresh && pendingEvents.length > 0) {
      setEvents(prev => {
        const merged = [...pendingEvents, ...prev];
        return merged.slice(0, 20);
      });
      setPendingEvents([]);
    }
  }, [autoRefresh, pendingEvents]);

  // Update timestamps every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (timestamp) => {
    const diff = Math.floor((new Date() - timestamp) / 1000);
    if (diff < 2) return 'Just now';
    return `${diff}s ago`;
  };

  const getIconColor = (activityType, newVal) => {
    if (activityType === 'STATUS') {
      return newVal === 'Failed' ? 'dot-alert' : (newVal === 'Completed' ? 'dot-completed' : 'dot-status');
    }
    if (activityType === 'ROI') {
      return parseFloat(newVal) < 0 ? 'dot-alert' : 'dot-updated';
    }
    return 'dot-updated';
  };

  const getEventText = (event) => {
    switch (event.activityType) {
      case 'STATUS':
        return (
          <>
            Status changed: <strong className="activity-old">{event.oldVal}</strong> → <strong className={`activity-new newVal-${event.newVal.toLowerCase()}`}>{event.newVal}</strong>
          </>
        );
      case 'ROI':
        return (
          <>
            ROI updated: <strong className="activity-old">{event.oldVal}</strong> → <strong className="activity-new newVal-roi">{event.newVal}</strong>
          </>
        );
      case 'ROBOTS':
        return (
          <>
            Robots deployed: <strong className="activity-old">{event.oldVal}</strong> → <strong className="activity-new newVal-robots">{event.newVal}</strong>
          </>
        );
      case 'SAVINGS':
        return (
          <>
            Savings updated: <strong className="activity-old">{formatCurrency(parseInt(event.oldVal, 10))}</strong> → <strong className="activity-new newVal-savings">{formatCurrency(parseInt(event.newVal, 10))}</strong>
          </>
        );
      default:
        return 'Telemetry heartbeat processed';
    }
  };

  const handleManualRefresh = () => {
    if (pendingEvents.length > 0) {
      setEvents(prev => {
        const merged = [...pendingEvents, ...prev];
        return merged.slice(0, 20);
      });
      setPendingEvents([]);
    }
  };

  return (
    <div className="activity-card" style={style}>
      <div className="activity-title-container">
        <h2 className="kpi-label" style={{ margin: 0 }}>Recent Activity</h2>
        
        {!autoRefresh && (
          <button 
            className={`activity-refresh-btn ${pendingEvents.length > 0 ? 'has-updates' : ''}`}
            onClick={handleManualRefresh}
            title={pendingEvents.length > 0 ? `Refresh Feed (${pendingEvents.length} new updates)` : 'Feed up to date'}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" className={pendingEvents.length > 0 ? 'spin-pulse' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.57-1.19"/>
            </svg>
            {pendingEvents.length > 0 && <span className="refresh-badge">{pendingEvents.length}</span>}
          </button>
        )}
      </div>

      <div className="activity-list">
        {events.length === 0 ? (
          <div className="activity-empty-state">
            Awaiting telemetry stream events...
          </div>
        ) : (
          events.map((event, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-icon-container">
                <span className={`activity-dot ${getIconColor(event.activityType, event.newVal)}`}></span>
              </div>
              <div className="activity-content">
                <div className="activity-project-name" title={event.project_name}>
                  {event.project_name}
                </div>
                <div className="activity-desc">
                  {getEventText(event)}
                </div>
              </div>
              <div className="activity-time">
                {getRelativeTime(event.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="activity-legend">
        <div className="legend-item">
          <span className="activity-dot dot-updated"></span> Updated
        </div>
        <div className="legend-item">
          <span className="activity-dot dot-status"></span> Status Change
        </div>
        <div className="legend-item">
          <span className="activity-dot dot-alert"></span> Alert
        </div>
      </div>
    </div>
  );
});

RecentActivityPanel.displayName = 'RecentActivityPanel';

/** Feature 6: Workspace Layout Manager toggling panel visibilities and persisting settings. */

import React, { useCallback, useSyncExternalStore } from 'react';
import { emit, on } from '../../engine/eventBus.js';
import '../../styles/layout.css';

// Default layout configurations
let layoutState = {
  kpi: true,
  grid: true,
  chart: true,
  controls: true,
  activity: true
};

const STORAGE_KEY = 'rpa_workspace_layout';

// Load stored settings on initial file load
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    layoutState = { ...layoutState, ...JSON.parse(saved) };
  }
} catch (e) {
  console.warn('[LayoutStore] Failed to read localStorage:', e);
}

const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(fn => fn());
};

// Store Object
export const layoutStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  getSnapshot() {
    return layoutState;
  },

  togglePanel(panel) {
    if (layoutState[panel] === undefined) return;
    
    layoutState = {
      ...layoutState,
      [panel]: !layoutState[panel]
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutState));
    } catch (e) {
      console.warn('[LayoutStore] Failed to save localStorage:', e);
    }

    notifyListeners();
    emit('LAYOUT_CHANGED', layoutState);
  }
};

export const LayoutManager = React.memo(() => {
  const currentLayout = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot
  );

  const toggle = useCallback((panel) => {
    layoutStore.togglePanel(panel);
  }, []);

  return (
    <div className="layout-manager-container" aria-label="Layout controls">
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 'bold' }}>PANELS:</span>
      <button 
        className={`layout-toggle-btn ${currentLayout.kpi ? 'active' : ''}`}
        onClick={() => toggle('kpi')}
        aria-pressed={currentLayout.kpi}
      >
        KPIs
      </button>
      <button 
        className={`layout-toggle-btn ${currentLayout.controls ? 'active' : ''}`}
        onClick={() => toggle('controls')}
        aria-pressed={currentLayout.controls}
      >
        Controls
      </button>
      <button 
        className={`layout-toggle-btn ${currentLayout.chart ? 'active' : ''}`}
        onClick={() => toggle('chart')}
        aria-pressed={currentLayout.chart}
      >
        Chart
      </button>
      <button 
        className={`layout-toggle-btn ${currentLayout.grid ? 'active' : ''}`}
        onClick={() => toggle('grid')}
        aria-pressed={currentLayout.grid}
      >
        Grid
      </button>
      <button 
        className={`layout-toggle-btn ${currentLayout.activity ? 'active' : ''}`}
        onClick={() => toggle('activity')}
        aria-pressed={currentLayout.activity}
      >
        Recent Activity
      </button>
    </div>
  );
});

LayoutManager.displayName = 'LayoutManager';

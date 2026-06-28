/** Root App orchestrator managing stream lifecycle initialization and panel layout persistence. */

import React, { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { initializeStream } from './engine/streamBridge.js';
import { getCurrentState, StreamStates } from './engine/streamStateMachine.js';
import { on } from './engine/eventBus.js';
import { KPIStrip } from './components/KPIStrip/KPIStrip.jsx';
import { PauseControl } from './components/PauseControl/PauseControl.jsx';
import { initializeWorker, computeWorkerClient } from './engine/computeWorkerClient.js';
import { AnalyticsOverlay } from './components/AnalyticsOverlay/AnalyticsOverlay.jsx';
import { VirtualGrid } from './components/VirtualGrid/VirtualGrid.jsx';
import { SearchBar } from './components/SearchBar/SearchBar.jsx';
import { FilterBar } from './components/FilterBar/FilterBar.jsx';
import { LayoutManager, layoutStore } from './components/LayoutManager/LayoutManager.jsx';
import { ChartComponent } from './components/ChartComponent/ChartComponent.jsx';
import { PerformanceMonitor } from './components/PerformanceMonitor/PerformanceMonitor.jsx';
import { RecentActivityPanel } from './components/RecentActivityPanel/RecentActivityPanel.jsx';
import { ProjectInspector } from './components/ProjectInspector/ProjectInspector.jsx';
import { Footer } from './components/Footer/Footer.jsx';
import { metricsEngine } from './engine/metricsEngine.js';
import './styles/global.css';
import './styles/layout.css';

export default function App() {
  // Subscribe to the stream state transitions
  const subscribeState = useCallback((callback) => {
    return on('STREAM_STATE_CHANGED', callback);
  }, []);

  const streamState = useSyncExternalStore(
    subscribeState,
    getCurrentState
  );

  // Subscribe to the workspace layout state
  const currentLayout = useSyncExternalStore(
    layoutStore.subscribe,
    layoutStore.getSnapshot
  );

  // Subscribe to the metrics engine snapshot updates
  const subscribeMetrics = useCallback((callback) => {
    return on('KPI_UPDATED', callback);
  }, []);

  const metricsSnapshot = useSyncExternalStore(
    subscribeMetrics,
    metricsEngine.getSnapshot
  );

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedRowUid, setSelectedRowUid] = useState(null);
  const [toast, setToast] = useState(null);

  const isPaused = streamState === StreamStates.PAUSED;

  // Auto-close inspector if stream resumes
  useEffect(() => {
    if (streamState === StreamStates.STREAMING) {
      setSelectedRowUid(null);
    }
  }, [streamState]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Toast Auto-Dismissal
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Client-side CSV export trigger
  const handleExportSnapshot = useCallback(() => {
    showToast('Preparing Snapshot...', 'info');
    
    const unsubscribe = on('EXPORT_COMPLETE', ({ csvString }) => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      const fileName = `snapshot_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.csv`;

      // Download trigger
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('✓ Snapshot exported successfully', 'success');
      unsubscribe();
    });

    computeWorkerClient.requestExport();
  }, [showToast]);

  // Resume/Streaming state auto-closes the overlay workspace
  useEffect(() => {
    if (streamState === StreamStates.STREAMING) {
      setIsAnalyticsOpen(false);
    }
  }, [streamState]);

  // Initialize the worker and stream on mount
  useEffect(() => {
    initializeWorker();
    initializeStream('./automation_projects.csv');
  }, []);

  // Map state to human-readable labels and classes
  const getBadgeDetails = () => {
    switch (streamState) {
      case StreamStates.STREAMING:
        return { label: 'Live Telemetry', className: 'status-streaming' };
      case StreamStates.PAUSED:
        return { label: 'Stream Paused', className: 'status-paused' };
      case StreamStates.LOADING:
        return { label: 'Parsing Database...', className: 'status-loading' };
      case StreamStates.ERROR:
        return { label: 'Connection Error', className: 'status-error' };
      default:
        return { label: 'Initializing', className: 'status-loading' };
    }
  };

  const badge = getBadgeDetails();

  return (
    <div className="app-container">
      <header className="app-header panel-glass">
        <div className="app-title-container">
          <h1 className="app-title">🛰️ RPA Enterprise Monitor</h1>
          
          <span className={`status-badge ${badge.className}`}>
            {streamState === StreamStates.STREAMING && <span className="pulse-dot"></span>}
            {badge.label}
          </span>

          {streamState === StreamStates.STREAMING && (
            <span className="header-throughput">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent-success)', marginRight: '4px' }}>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              {metricsSnapshot.rowsPerSecond || 0} updates/sec
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LayoutManager />
          <PerformanceMonitor />
          <button 
            className="analytics-view-btn"
            disabled={streamState !== StreamStates.PAUSED}
            onClick={() => setIsAnalyticsOpen(true)}
            title={streamState === StreamStates.PAUSED ? 'Open Executive Analytics Workspace' : 'Pause telemetry pipeline to analyze snapshot'}
          >
            📊 Analytics View
          </button>
          <PauseControl />
        </div>
      </header>

      {/* KPI metrics Strip */}
      <div className={`panel-wrapper ${!currentLayout.kpi ? 'panel-hidden' : ''}`}>
        <KPIStrip />
      </div>

      {/* Real-time Operator Controls Panel */}
      <div 
        className={`panel-wrapper ${!currentLayout.controls ? 'panel-hidden' : ''}`}
        style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'stretch', position: 'relative', zIndex: 10 }}
      >
        <SearchBar />
        <FilterBar />
        <button 
          className="export-snapshot-btn"
          style={{ height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleExportSnapshot}
          title="Export current filtered & sorted view as CSV"
        >
          📤 Export Snapshot
        </button>
      </div>

      <main style={{ display: 'flex', gap: '12px', overflow: 'visible' }}>
        {/* Left Column: Chart, Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Analytics Line Graph Panel */}
          <div 
            className={`panel-wrapper ${!currentLayout.chart ? 'panel-hidden' : ''}`}
            style={{ height: '320px', width: '100%' }}
          >
            <ChartComponent />
          </div>

          {/* Virtualized Recycled Table Grid */}
          <div 
            className={`panel-wrapper ${!currentLayout.grid ? 'panel-hidden' : ''}`}
            style={{ height: '480px', display: 'flex', flexDirection: 'column' }}
          >
            <VirtualGrid isPaused={isPaused} onRowClick={setSelectedRowUid} />
          </div>
        </div>

        {/* Right Column: Recent Activity (vertical stretch to match Chart + Grid combined) */}
        {currentLayout.activity && (
          <div 
            className="panel-wrapper"
            style={{ 
              width: '320px', 
              height: currentLayout.chart && currentLayout.grid ? '812px' : (currentLayout.chart ? '320px' : (currentLayout.grid ? '480px' : '0px')), 
              flexShrink: 0, 
              display: 'flex', 
              flexDirection: 'column' 
            }}
          >
            <RecentActivityPanel style={{ flex: 1, minHeight: 0 }} />
          </div>
        )}
      </main>

      <Footer />

      {isAnalyticsOpen && (
        <AnalyticsOverlay onClose={() => setIsAnalyticsOpen(false)} />
      )}

      <ProjectInspector selectedUid={selectedRowUid} isOpen={!!selectedRowUid} onClose={() => setSelectedRowUid(null)} />

      {toast && (
        <div className={`toast-notification ${toast.type}`} role="alert" aria-live="polite">
          {toast.message}
        </div>
      )}
    </div>
  );
}

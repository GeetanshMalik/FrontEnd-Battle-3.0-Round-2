/** Feature 8: High-Frequency Virtualized DOM Grid with Web Worker search, filter, and sort connection. */

import React, { useRef, useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import { computeWorkerClient } from '../../engine/computeWorkerClient.js';
import { stateEngine } from '../../engine/stateEngine.js';
import { useVirtualScroll } from './useVirtualScroll.js';
import { ViewportRow } from './ViewportRow.jsx';
import { SortHeader } from '../SortHeader/SortHeader.jsx';
import { on } from '../../engine/eventBus.js';
import '../../styles/grid.css';

const ROW_HEIGHT = 36;
const OVERSCAN = 5;

export const VirtualGrid = React.memo(({ isPaused, onRowClick }) => {
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  
  // Track sorting keys locally to render direction arrow indicators in SortHeader components
  const [sortKeys, setSortKeys] = useState([]);

  // Subscribes directly to the off-main-thread compute worker store results
  const dataset = useSyncExternalStore(
    computeWorkerClient.subscribe,
    computeWorkerClient.getSnapshot
  );

  const totalCount = dataset.length;

  // Stable getter function for scroll list lookups (looks up from stateEngine to avoid full object serialization)
  const getRowData = useCallback((index) => {
    const uid = dataset[index];
    return uid ? stateEngine.getRow(uid) : undefined;
  }, [dataset]);

  // Hook up virtual scroll recycling math
  const { visibleCount, scrollStateRef, forceUpdate } = useVirtualScroll({
    containerRef,
    tableRef,
    rowHeight: ROW_HEIGHT,
    overscan: OVERSCAN,
    totalCount,
    getRowData
  });

  // Force update rows when dataset changes (e.g. initial load or search updates arrive)
  useEffect(() => {
    forceUpdate();
  }, [dataset, forceUpdate]);

  // Listen to live telemetry updates to trigger row highlights
  useEffect(() => {
    const unsubscribe = on('STATE_UPDATED', () => {
      forceUpdate();
    });
    return unsubscribe;
  }, [forceUpdate]);

  // Handle Sort Change triggers from headers
  const handleSortChange = useCallback((newSortKeys) => {
    setSortKeys(newSortKeys);
    computeWorkerClient.updateSort(newSortKeys);
  }, []);

  // Generate the fixed list of ViewportRow elements
  const rowElements = useMemo(() => {
    const items = [];
    for (let i = 0; i < visibleCount; i++) {
      items.push(
        <ViewportRow
          key={i}
          ref={(inst) => {
            if (inst) {
              scrollStateRef.current.rows[i] = inst;
            }
          }}
          isPaused={isPaused}
          onRowClick={onRowClick}
        />
      );
    }
    return items;
  }, [visibleCount, scrollStateRef, isPaused, onRowClick]);

  return (
    <div className="grid-wrapper">
      <div className="grid-scroll-container" ref={containerRef}>
        {/* Absolute scroll-runway spacer representing scroll offset bounds */}
        <div 
          className="grid-scroll-runway" 
          style={{ height: `${totalCount * ROW_HEIGHT}px` }}
        ></div>

        <table className="grid-table">
          <thead>
            <tr>
              <th className="col-id">
                <SortHeader column="project_id" label="Project ID" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-name">
                <SortHeader column="project_name" label="Name" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-type">
                <SortHeader column="automation_type" label="Automation Type" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-robots">
                <SortHeader column="robots_deployed" label="Robots" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-budget">
                <SortHeader column="budget_usd" label="Budget" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-savings">
                <SortHeader column="annual_savings_usd" label="Savings" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-roi">
                <SortHeader column="roi_percent" label="ROI" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-hours">
                <SortHeader column="employee_hours_saved" label="Hours Saved" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
              <th className="col-status">
                <SortHeader column="project_status" label="Status" sortKeys={sortKeys} onSortChange={handleSortChange} />
              </th>
            </tr>
          </thead>
          <tbody ref={tableRef}>
            {rowElements}
          </tbody>
        </table>
        
        {totalCount === 0 && (
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.875rem'
            }}
          >
            Awaiting database parse...
          </div>
        )}
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

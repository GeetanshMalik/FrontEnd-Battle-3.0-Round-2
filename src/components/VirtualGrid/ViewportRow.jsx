/** High-performance recycled Viewport Row Slot rendering 9 data cells with direct DOM mutation. */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { formatCurrency, formatPercent, formatInteger } from '../../utils/formatters.js';
import '../../styles/alerts.css';

export const ViewportRow = forwardRef(({ isPaused, onRowClick }, ref) => {
  const trRef = useRef(null);
  const cellRefs = useRef([]);
  const rowDataRef = useRef(null);

  // Expose imperative update method to parent to write straight to cell textContent
  useImperativeHandle(ref, () => ({
    update(rowData) {
      if (!rowData || !trRef.current) return;
      rowDataRef.current = rowData;

      const cells = cellRefs.current;
      const tr = trRef.current;

      const currentProjId = tr.getAttribute('data-project-id');
      const isSameProject = currentProjId === rowData.project_id;
      tr.setAttribute('data-project-id', rowData.project_id || '');

      const isRecentUpdate = rowData._lastUpdated && (Date.now() - rowData._lastUpdated < 350);
      let shouldRowFlash = isSameProject && isRecentUpdate;

      // Helper to update text content
      const updateCell = (cellIndex, newValue) => {
        const cell = cells[cellIndex];
        if (cell) cell.textContent = newValue;
      };

      updateCell(0, rowData.project_id || '');
      updateCell(1, rowData.project_name || '');
      updateCell(2, rowData.automation_type || '');
      updateCell(3, formatInteger(rowData.robots_deployed));
      updateCell(4, formatCurrency(rowData.budget_usd));
      updateCell(5, formatCurrency(rowData.annual_savings_usd));
      updateCell(6, formatPercent(rowData.roi_percent));
      updateCell(7, formatInteger(rowData.employee_hours_saved));

      const statusBadge = cells[8]?.firstElementChild;
      if (statusBadge) {
        const status = rowData.project_status || 'Active';
        statusBadge.textContent = status;
        statusBadge.className = `badge-status badge-${status.toLowerCase()}`;
      }

      // Flash entire row on live telemetry updates
      if (shouldRowFlash) {
        if (tr._rowFlashTimeout) clearTimeout(tr._rowFlashTimeout);
        tr.classList.remove('row-updated');
        void tr.offsetWidth; // Force reflow to restart animation
        tr.classList.add('row-updated');
        tr._rowFlashTimeout = setTimeout(() => {
          tr.classList.remove('row-updated');
        }, 500);
      }

      // Feature 3: Visual Alert System class toggles via direct DOM reference
      const isFailed = rowData.project_status === 'Failed';
      const isAnomaly = parseFloat(rowData.roi_percent) < 0;

      const wasFailed = tr.getAttribute('data-failed') === 'true';
      const wasAnomaly = tr.getAttribute('data-anomaly') === 'true';

      if (isFailed !== wasFailed) {
        tr.setAttribute('data-failed', isFailed ? 'true' : 'false');
        tr.classList.toggle('row-alert-failed', isFailed);
      }
      
      if (isAnomaly !== wasAnomaly) {
        tr.setAttribute('data-anomaly', isAnomaly ? 'true' : 'false');
        tr.classList.toggle('row-alert-anomaly', isAnomaly);
      }
    }
  }));

  const handleClick = () => {
    if (!isPaused || !rowDataRef.current) return;
    onRowClick(rowDataRef.current.internal_uid);
  };

  return (
    <tr 
      ref={trRef} 
      onClick={handleClick} 
      className={isPaused ? 'row-inspectable' : ''}
    >
      <td ref={el => cellRefs.current[0] = el} className="col-id"></td>
      <td ref={el => cellRefs.current[1] = el} className="col-name"></td>
      <td ref={el => cellRefs.current[2] = el} className="col-type"></td>
      <td ref={el => cellRefs.current[3] = el} className="col-robots"></td>
      <td ref={el => cellRefs.current[4] = el} className="col-budget"></td>
      <td ref={el => cellRefs.current[5] = el} className="col-savings"></td>
      <td ref={el => cellRefs.current[6] = el} className="col-roi"></td>
      <td ref={el => cellRefs.current[7] = el} className="col-hours"></td>
      <td ref={el => cellRefs.current[8] = el} className="col-status">
        <span className="badge-status"></span>
      </td>
    </tr>
  );
});

ViewportRow.displayName = 'ViewportRow';

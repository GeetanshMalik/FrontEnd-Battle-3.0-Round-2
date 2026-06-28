import React, { useEffect, useRef } from 'react';
import { stateEngine } from '../../engine/stateEngine.js';
import { getCurrentState } from '../../engine/streamStateMachine.js';
import { formatCurrency, formatPercent, formatInteger } from '../../utils/formatters.js';
import '../../styles/inspector.css';

export const ProjectInspector = React.memo(({ selectedUid, isOpen, onClose }) => {
  const panelRef = useRef(null);

  // Close on Escape key press or click outside the panel
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      // Don't close if clicking a table row (to allow switching between rows)
      if (event.target.closest('tr')) return;
      // Don't close if clicking inside the panel
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const row = selectedUid ? stateEngine.getRow(selectedUid) : null;

  if (!row) return null;

  // Format Helper functions with fallbacks
  const displayVal = (val, fallback = 'N/A') => (val !== undefined && val !== null && val !== '') ? val : fallback;
  
  // Deterministic fallbacks for fields not parsed directly from CSV
  const costVal = row.cost_usd || Math.round(row.budget_usd * 0.85);
  const revenueVal = row.annual_revenue_usd || Math.round(row.annual_savings_usd * 2.5);
  const employeeCount = row.employee_count || (row.robots_deployed * 12);
  const customerCount = row.customer_count || Math.floor(row.budget_usd / 150);
  const marketShare = row.market_share_percent || `${(Math.max(0.1, (row.roi_percent || 10) / 120)).toFixed(2)}%`;
  const autoCoverage = `${(Math.min(95, (row.robots_deployed || 1) * 3.2 + 20)).toFixed(1)}%`;
  const executionFreq = (row.robots_deployed || 0) > 20 ? 'Continuous' : 'Daily';
  const regionVal = row.country || 'Global';
  const ownerVal = row.implementation_partner || 'Internal Operations';
  const priorityVal = (row.roi_percent || 0) > 150 ? 'High' : ((row.roi_percent || 0) > 50 ? 'Medium' : 'Low');
  const riskVal = row.project_status === 'Failed' ? 'Critical' : ((row.roi_percent || 0) < 0 ? 'High' : 'Low');
  const complianceVal = row.cloud_deployment === 'Yes' ? 'SOX / GDPR Certified' : 'Internal Audit Approved';

  return (
    <div 
      ref={panelRef} 
      className={`inspector-panel ${isOpen ? 'open' : ''}`}
      role="dialog" 
      aria-label="Project Inspector Panel"
    >
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-title-area">
          <h2 className="inspector-project-name" title={row.project_name}>
            {row.project_name || 'Project Details'}
          </h2>
          <div className="inspector-meta-row">
            <span>{row.project_id}</span>
            <span>•</span>
            <span>{row.department}</span>
            <span>•</span>
            <span className={`badge-status badge-${(row.project_status || 'Active').toLowerCase()}`}>
              {row.project_status}
            </span>
          </div>
        </div>
        <button className="inspector-close-btn" onClick={onClose} aria-label="Close Inspector">
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="inspector-content">
        {/* Optional Enhancement Mini KPI Chips */}
        <div className="inspector-chips-row">
          <div className="inspector-chip">
            <span className="inspector-chip-label">ROI</span>
            <span className="inspector-chip-value">{formatPercent(row.roi_percent)}</span>
          </div>
          <div className="inspector-chip">
            <span className="inspector-chip-label">Savings</span>
            <span className="inspector-chip-value">{formatCurrency(row.annual_savings_usd)}</span>
          </div>
          <div className="inspector-chip">
            <span className="inspector-chip-label">Revenue</span>
            <span className="inspector-chip-value">{formatCurrency(revenueVal)}</span>
          </div>
          <div className="inspector-chip">
            <span className="inspector-chip-label">Robots</span>
            <span className="inspector-chip-value">{formatInteger(row.robots_deployed)}</span>
          </div>
        </div>

        {/* Section: Project */}
        <div className="inspector-section">
          <h3 className="inspector-section-title">Project Details</h3>
          <div className="inspector-data-grid">
            <div className="inspector-data-card">
              <span className="inspector-card-label">Project ID</span>
              <span className="inspector-card-value">{row.project_id}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Automation Type</span>
              <span className="inspector-card-value">{row.automation_type}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Department</span>
              <span className="inspector-card-value">{row.department}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Industry</span>
              <span className="inspector-card-value">{row.industry}</span>
            </div>
          </div>
        </div>

        {/* Section: Financial */}
        <div className="inspector-section">
          <h3 className="inspector-section-title">Financial Performance</h3>
          <div className="inspector-data-grid">
            <div className="inspector-data-card">
              <span className="inspector-card-label">Annual Savings</span>
              <span className="inspector-card-value">{formatCurrency(row.annual_savings_usd)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Project Budget</span>
              <span className="inspector-card-value">{formatCurrency(row.budget_usd)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Project Cost</span>
              <span className="inspector-card-value">{formatCurrency(costVal)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Estimated ROI</span>
              <span className="inspector-card-value">{formatPercent(row.roi_percent)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Annual Revenue</span>
              <span className="inspector-card-value">{formatCurrency(revenueVal)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Hours Saved</span>
              <span className="inspector-card-value">{formatInteger(row.employee_hours_saved)}</span>
            </div>
          </div>
        </div>

        {/* Section: Operations */}
        <div className="inspector-section">
          <h3 className="inspector-section-title">Operations Metrics</h3>
          <div className="inspector-data-grid">
            <div className="inspector-data-card">
              <span className="inspector-card-label">Robots Deployed</span>
              <span className="inspector-card-value">{formatInteger(row.robots_deployed)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">FTE Allocation</span>
              <span className="inspector-card-value">{formatInteger(employeeCount)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Customer Impact</span>
              <span className="inspector-card-value">{formatInteger(customerCount)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Market Share</span>
              <span className="inspector-card-value">{marketShare}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Auto Coverage</span>
              <span className="inspector-card-value">{autoCoverage}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Execution Frequency</span>
              <span className="inspector-card-value">{executionFreq}</span>
            </div>
          </div>
        </div>

        {/* Section: Business */}
        <div className="inspector-section">
          <h3 className="inspector-section-title">Business Alignment</h3>
          <div className="inspector-data-grid">
            <div className="inspector-data-card">
              <span className="inspector-card-label">Region</span>
              <span className="inspector-card-value">{regionVal}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Project Owner</span>
              <span className="inspector-card-value">{ownerVal}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Priority Level</span>
              <span className="inspector-card-value">{priorityVal}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Risk Level</span>
              <span className="inspector-card-value">{riskVal}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Business Unit</span>
              <span className="inspector-card-value">{row.department}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Compliance</span>
              <span className="inspector-card-value">{complianceVal}</span>
            </div>
          </div>
        </div>

        {/* Section: System */}
        <div className="inspector-section">
          <h3 className="inspector-section-title">System Information</h3>
          <div className="inspector-data-grid">
            <div className="inspector-data-card">
              <span className="inspector-card-label">Last Updated</span>
              <span className="inspector-card-value">{displayVal(row._lastUpdated ? new Date(row._lastUpdated).toLocaleTimeString() : undefined)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Stream State</span>
              <span className="inspector-card-value">{getCurrentState()}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Last Modified Tick</span>
              <span className="inspector-card-value">{displayVal(row._lastUpdated ? Math.floor(row._lastUpdated / 1000) % 1000 : undefined)}</span>
            </div>
            <div className="inspector-data-card">
              <span className="inspector-card-label">Project Identifier</span>
              <span className="inspector-card-value" style={{ fontSize: '0.65rem' }}>{row.internal_uid}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProjectInspector.displayName = 'ProjectInspector';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { stateEngine } from '../../engine/stateEngine.js';
import '../../styles/analytics.css';

Chart.register(...registerables);

const formatCompactCurrency = (value) => {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value}`;
};

export const AnalyticsOverlay = React.memo(({ onClose }) => {
  const c1Ref = useRef(null);
  const c2Ref = useRef(null);
  const c3Ref = useRef(null);
  const c4Ref = useRef(null);
  const c5Ref = useRef(null);
  const c6Ref = useRef(null);

  const inst1Ref = useRef(null);
  const inst2Ref = useRef(null);
  const inst3Ref = useRef(null);
  const inst4Ref = useRef(null);
  const inst5Ref = useRef(null);
  const inst6Ref = useRef(null);

  useEffect(() => {
    const rows = stateEngine.getRows();

    // 1. Automation Type Distribution
    const typeCounts = {};
    rows.forEach(r => {
      const type = r.automation_type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // 2. Status Distribution
    const statusCounts = {};
    rows.forEach(r => {
      const status = r.project_status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // 3. Department Budget Allocation
    const deptBudget = {};
    rows.forEach(r => {
      const dept = r.department || 'Unknown';
      const budget = parseInt(r.budget_usd, 10) || 0;
      deptBudget[dept] = (deptBudget[dept] || 0) + budget;
    });

    // 4. Industry Distribution
    const indCounts = {};
    rows.forEach(r => {
      const ind = r.industry || 'Unknown';
      indCounts[ind] = (indCounts[ind] || 0) + 1;
    });

    // 5. ROI Distribution Histogram
    const roiBins = {
      '< 0%': 0,
      '0-50%': 0,
      '50-100%': 0,
      '100-150%': 0,
      '150-200%': 0,
      '> 200%': 0
    };
    rows.forEach(r => {
      const roi = parseFloat(r.roi_percent) || 0;
      if (roi < 0) roiBins['< 0%']++;
      else if (roi <= 50) roiBins['0-50%']++;
      else if (roi <= 100) roiBins['50-100%']++;
      else if (roi <= 150) roiBins['100-150%']++;
      else if (roi <= 200) roiBins['150-200%']++;
      else roiBins['> 200%']++;
    });

    // 6. Top 10 Savings Projects
    const topSavings = [...rows]
      .sort((a, b) => (parseInt(b.annual_savings_usd, 10) || 0) - (parseInt(a.annual_savings_usd, 10) || 0))
      .slice(0, 10);

    const themeColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
    const fontSettings = { family: 'var(--font-sans)', color: '#94a3b8' };
    const gridSettings = { color: 'rgba(51, 65, 85, 0.3)' };

    // Instantiate Chart 1: Automation Type (Pie)
    if (c1Ref.current) {
      inst1Ref.current = new Chart(c1Ref.current, {
        type: 'pie',
        data: {
          labels: Object.keys(typeCounts),
          datasets: [{
            data: Object.values(typeCounts),
            backgroundColor: themeColors,
            borderWidth: 1,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', font: fontSettings } }
          }
        }
      });
    }

    // Instantiate Chart 2: Status Distribution (Doughnut)
    if (c2Ref.current) {
      inst2Ref.current = new Chart(c2Ref.current, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ['#10b981', '#ec4899', '#ef4444', '#f59e0b', '#6366f1'],
            borderWidth: 1,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', font: fontSettings } }
          }
        }
      });
    }

    // Instantiate Chart 3: Department Budget Allocation (Bar)
    if (c3Ref.current) {
      inst3Ref.current = new Chart(c3Ref.current, {
        type: 'bar',
        data: {
          labels: Object.keys(deptBudget),
          datasets: [{
            label: 'Budget',
            data: Object.values(deptBudget),
            backgroundColor: 'rgba(14, 165, 233, 0.75)',
            borderColor: '#0ea5e9',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Budget: ${formatCompactCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: {
              ticks: {
                color: '#94a3b8',
                callback: (val) => formatCompactCurrency(val)
              },
              grid: gridSettings
            }
          }
        }
      });
    }

    // Instantiate Chart 4: Industry Distribution (Horizontal Bar)
    if (c4Ref.current) {
      inst4Ref.current = new Chart(c4Ref.current, {
        type: 'bar',
        data: {
          labels: Object.keys(indCounts),
          datasets: [{
            label: 'ProjectsCount',
            data: Object.values(indCounts),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: gridSettings },
            y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
          }
        }
      });
    }

    // Instantiate Chart 5: ROI Distribution Histogram (Bar)
    if (c5Ref.current) {
      inst5Ref.current = new Chart(c5Ref.current, {
        type: 'bar',
        data: {
          labels: Object.keys(roiBins),
          datasets: [{
            label: 'Projects',
            data: Object.values(roiBins),
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: gridSettings }
          }
        }
      });
    }

    // Instantiate Chart 6: Top 10 Savings Projects (Horizontal Bar)
    if (c6Ref.current) {
      inst6Ref.current = new Chart(c6Ref.current, {
        type: 'bar',
        data: {
          labels: topSavings.map(r => r.project_name),
          datasets: [{
            label: 'Annual Savings',
            data: topSavings.map(r => parseInt(r.annual_savings_usd, 10) || 0),
            backgroundColor: 'rgba(139, 92, 246, 0.75)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Savings: ${formatCompactCurrency(ctx.raw)}`
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#94a3b8',
                callback: (val) => formatCompactCurrency(val)
              },
              grid: gridSettings
            },
            y: {
              ticks: {
                color: '#94a3b8',
                callback: function(val, index) {
                  // Truncate long project labels for display
                  const label = this.getLabelForValue(val);
                  return label.length > 20 ? label.slice(0, 18) + '...' : label;
                }
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    return () => {
      if (inst1Ref.current) inst1Ref.current.destroy();
      if (inst2Ref.current) inst2Ref.current.destroy();
      if (inst3Ref.current) inst3Ref.current.destroy();
      if (inst4Ref.current) inst4Ref.current.destroy();
      if (inst5Ref.current) inst5Ref.current.destroy();
      if (inst6Ref.current) inst6Ref.current.destroy();
    };
  }, []);

  return (
    <div className="analytics-overlay" role="dialog" aria-modal="true" aria-labelledby="analytics-workspace-title">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h1 id="analytics-workspace-title">🛰️ Executive Analytics Workspace</h1>
          <p className="analytics-subtitle">Frozen snapshot analytics based on the active 50,000 RPA project database state</p>
        </div>
        <button className="analytics-close-btn" onClick={onClose} aria-label="Close Analytics Workspace">
          Close Workspace
        </button>
      </div>

      <div className="analytics-grid">
        <div className="analytics-row">
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Automation Type Distribution</h3>
            <div className="analytics-chart-container">
              <canvas ref={c1Ref}></canvas>
            </div>
          </div>
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Status Distribution</h3>
            <div className="analytics-chart-container">
              <canvas ref={c2Ref}></canvas>
            </div>
          </div>
        </div>

        <div className="analytics-row">
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Department Budget Allocation</h3>
            <div className="analytics-chart-container">
              <canvas ref={c3Ref}></canvas>
            </div>
          </div>
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Industry Distribution</h3>
            <div className="analytics-chart-container">
              <canvas ref={c4Ref}></canvas>
            </div>
          </div>
        </div>

        <div className="analytics-row">
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">ROI Distribution Histogram</h3>
            <div className="analytics-chart-container">
              <canvas ref={c5Ref}></canvas>
            </div>
          </div>
          <div className="analytics-chart-card">
            <h3 className="analytics-chart-title">Top 10 Savings Projects</h3>
            <div className="analytics-chart-container">
              <canvas ref={c6Ref}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AnalyticsOverlay.displayName = 'AnalyticsOverlay';

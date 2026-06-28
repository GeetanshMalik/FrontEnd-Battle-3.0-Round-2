/** Feature 6: High-performance Canvas Analytics Chart component rendering rolling Business Value Trend. */

import React, { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { on } from '../../engine/eventBus.js';
import { metricsEngine } from '../../engine/metricsEngine.js';

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

export const ChartComponent = React.memo(() => {
  const canvasRef = useRef(null);
  
  // Stable Y-axis ranges preserved across render ticks
  const yAxisMinRef = useRef(null);
  const yAxisMaxRef = useRef(null);

  // Subscribe to the metrics history store
  const subscribeHistory = useCallback((callback) => {
    return on('KPI_UPDATED', callback);
  }, []);

  const history = useSyncExternalStore(
    subscribeHistory,
    metricsEngine.getHistorySnapshot
  );

  const { savingsHistory } = history;

  // Redraw the canvas graph when history updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    if (savingsHistory.length < 2) {
      // Draw loading placeholder
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Awaiting stream metrics data...', width / 2, height / 2);
      return;
    }

    const padding = { top: 20, right: 20, bottom: 25, left: 65 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max values in the active history buffer
    const maxSavings = Math.max(...savingsHistory);
    const minSavings = Math.min(...savingsHistory);
    const range = maxSavings - minSavings || 10000;

    const targetMin = Math.max(0, minSavings - range * 0.1);
    const targetMax = maxSavings + range * 0.1;

    // Stable axis boundaries initialization and breakout checks
    if (yAxisMinRef.current === null || yAxisMaxRef.current === null) {
      yAxisMinRef.current = targetMin;
      yAxisMaxRef.current = targetMax;
    } else {
      // Re-scale only when current sample values exceed the current axis limits
      if (minSavings < yAxisMinRef.current || maxSavings > yAxisMaxRef.current) {
        yAxisMinRef.current = targetMin;
        yAxisMaxRef.current = targetMax;
      }
    }

    const yMin = yAxisMinRef.current;
    const yMax = yAxisMaxRef.current;
    const pointsCount = savingsHistory.length;

    // 1. Draw grid lines (Exactly 5 ticks)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 1;
    const gridTicks = 4;
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px var(--font-mono)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridTicks; i++) {
      const yVal = yMin + ((yMax - yMin) / gridTicks) * i;
      const y = padding.top + chartHeight - (chartHeight / gridTicks) * i;
      
      // Draw grid line
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Draw compact currency label
      ctx.fillText(formatCompactCurrency(yVal), padding.left - 10, y);
    }

    // 2. Draw line and fill area
    ctx.beginPath();
    for (let i = 0; i < pointsCount; i++) {
      const x = padding.left + (chartWidth / (MAX_HISTORY - 1)) * (MAX_HISTORY - pointsCount + i);
      const y = padding.top + chartHeight - ((savingsHistory[i] - yMin) / (yMax - yMin)) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Stroke style configurations (Thicker line, neon blue/cyan)
    ctx.strokeStyle = 'hsl(199, 89%, 48%)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Softer linear gradient fill under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(14, 165, 233, 0.12)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
    
    // Draw fill area first
    ctx.save();
    ctx.lineTo(padding.left + (chartWidth / (MAX_HISTORY - 1)) * (MAX_HISTORY - 1), padding.top + chartHeight);
    ctx.lineTo(padding.left + (chartWidth / (MAX_HISTORY - 1)) * (MAX_HISTORY - pointsCount), padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Stroke the line
    ctx.stroke();

    // 3. Draw the latest point highlight with circular glowing effects
    const lastIndex = pointsCount - 1;
    const lastX = padding.left + (chartWidth / (MAX_HISTORY - 1)) * (MAX_HISTORY - pointsCount + lastIndex);
    const lastY = padding.top + chartHeight - ((savingsHistory[lastIndex] - yMin) / (yMax - yMin)) * chartHeight;
    
    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(14, 165, 233, 0.4)';
    ctx.fill();

    // Inner Glowing Core
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'hsl(199, 89%, 65%)';
    ctx.fill();
    
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [savingsHistory]);

  // Value always represents the newest value in the rolling history
  const newestValue = savingsHistory.length > 0 ? formatCompactCurrency(savingsHistory[savingsHistory.length - 1]) : '$0';

  return (
    <div className="chart-card panel-glass">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="kpi-label" style={{ margin: 0 }}>Business Value (Rolling Window)</h2>
          <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            Value: <strong>{newestValue}</strong>
          </div>
        </div>
        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          Real-time business value throughput of processed automation telemetry events
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: '120px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
      </div>
    </div>
  );
});

ChartComponent.displayName = 'ChartComponent';

const MAX_HISTORY = 100;

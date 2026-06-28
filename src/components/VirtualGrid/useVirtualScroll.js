/** Custom hook managing viewport sizing, scroll event attachment and RAF-gated recycling. */

import { useEffect, useState, useRef } from 'react';

export const useVirtualScroll = ({ containerRef, tableRef, rowHeight = 36, overscan = 5, totalCount, getRowData }) => {
  const [visibleCount, setVisibleCount] = useState(25); // Safe initial default
  const rafIdRef = useRef(null);
  
  // Track scroll state imperatively to prevent React re-renders on scroll
  const scrollStateRef = useRef({
    lastScrollTop: -1,
    startIndex: 0,
    rows: [] // Holds refs to ViewportRow component instances
  });

  // Calculate required recycled slot count based on container client height
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleCount = () => {
      const height = container.clientHeight || 500;
      const count = Math.ceil(height / rowHeight) + overscan;
      setVisibleCount(count);
    };

    updateVisibleCount();

    // ResizeObserver to handle layout adjustments dynamically
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);

    return () => observer.disconnect();
  }, [containerRef, rowHeight, overscan]);

  // Imperative scroll update loop gated by requestAnimationFrame
  const performUpdate = (force = false) => {
    const container = containerRef.current;
    const table = tableRef.current;
    if (!container || !table) return;

    const scrollTop = container.scrollTop;
    
    // Skip if scrollTop hasn't changed
    if (!force && scrollTop === scrollStateRef.current.lastScrollTop) {
      rafIdRef.current = null;
      return;
    }

    scrollStateRef.current.lastScrollTop = scrollTop;

    // Calculate indexes
    let startIndex = Math.floor(scrollTop / rowHeight);
    // Clamp values
    const maxStart = Math.max(0, totalCount - visibleCount);
    startIndex = Math.max(0, Math.min(startIndex, maxStart));
    
    scrollStateRef.current.startIndex = startIndex;

    // Position the table wrapper via transform to simulate scroll positioning
    const offsetY = startIndex * rowHeight;
    table.style.transform = `translate3d(0, ${offsetY}px, 0)`;

    // Iterate through active viewport row slots and imperatively update content
    const activeRows = scrollStateRef.current.rows;
    const activeRowCount = activeRows.length;

    for (let i = 0; i < activeRowCount; i++) {
      const rowRef = activeRows[i];
      if (!rowRef) continue;

      const dataIndex = startIndex + i;
      const rowData = getRowData(dataIndex);
      
      if (rowData) {
        rowRef.update(rowData);
      }
    }

    rafIdRef.current = null;
  };

  // Attach raw scroll listener directly to bypass React virtual DOM diffing
  useEffect(() => {
    // Reset lastScrollTop to force updates when totalCount or other dependencies change
    scrollStateRef.current.lastScrollTop = -1;

    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Gate layout read/writes inside requestAnimationFrame for locked 60 FPS
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => performUpdate(false));
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Force initial update to populate table contents
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [containerRef, tableRef, visibleCount, totalCount, getRowData]);

  // Public method to trigger an external update (e.g. when data stream modifies rows)
  const forceUpdate = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    rafIdRef.current = requestAnimationFrame(() => performUpdate(true));
  };

  return {
    visibleCount,
    scrollStateRef,
    forceUpdate
  };
};

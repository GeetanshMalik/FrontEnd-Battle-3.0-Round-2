/** Feature 4 & 9: Compound Sorter Header Component supporting Shift+Click sorting. */

import React, { useCallback } from 'react';

export const SortHeader = React.memo(({ column, label, sortKeys, onSortChange, className = '' }) => {
  // Find if this column is in the active sort keys array
  const keyIndex = sortKeys.findIndex(k => k.col === column);
  const activeKey = keyIndex !== -1 ? sortKeys[keyIndex] : null;

  const handleClick = useCallback((event) => {
    event.preventDefault();
    
    const isShiftPressed = event.shiftKey;
    let newSortKeys = [...sortKeys];

    if (activeKey) {
      if (activeKey.dir === 'asc') {
        // asc -> desc
        if (isShiftPressed) {
          newSortKeys[keyIndex] = { col: column, dir: 'desc' };
        } else {
          newSortKeys = [{ col: column, dir: 'desc' }];
        }
      } else {
        // desc -> unsorted
        if (isShiftPressed) {
          newSortKeys.splice(keyIndex, 1);
        } else {
          newSortKeys = [];
        }
      }
    } else {
      // unsorted -> asc
      if (isShiftPressed) {
        newSortKeys.push({ col: column, dir: 'asc' });
      } else {
        newSortKeys = [{ col: column, dir: 'asc' }];
      }
    }

    onSortChange(newSortKeys);
  }, [column, sortKeys, activeKey, keyIndex, onSortChange]);

  // Determine sort arrow character and badge layout
  const getSortIndicator = () => {
    if (!activeKey) return '↕';
    return activeKey.dir === 'asc' ? '▲' : '▼';
  };

  const isSorted = activeKey !== null;

  return (
    <div 
      className={`sort-header ${className} ${isSorted ? 'sorted' : ''}`}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        gap: '6px',
        width: '100%',
        userSelect: 'none'
      }}
      role="columnheader"
      aria-sort={isSorted ? (activeKey.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="sort-label">{label}</span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)' }}>
        <span 
          style={{ 
            fontSize: '0.7rem', 
            color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)',
            opacity: isSorted ? 1 : 0.4
          }}
        >
          {getSortIndicator()}
        </span>
        
        {/* If compound sorting is active, show the sort order badge index (1-based) */}
        {sortKeys.length > 1 && isSorted && (
          <span 
            style={{
              fontSize: '0.65rem',
              background: 'var(--accent-cyan)',
              color: 'var(--bg-main)',
              borderRadius: '2px',
              padding: '1px 3px',
              fontWeight: '700',
              lineHeight: 1
            }}
          >
            {keyIndex + 1}
          </span>
        )}
      </div>
    </div>
  );
});

SortHeader.displayName = 'SortHeader';

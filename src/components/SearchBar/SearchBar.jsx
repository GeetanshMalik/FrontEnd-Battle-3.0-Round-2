/** Feature 10: Debounced Multi-Field Fuzzy Search input parsing keyword tokens. */

import React, { useState, useEffect } from 'react';
import { computeWorkerClient } from '../../engine/computeWorkerClient.js';

export const SearchBar = React.memo(() => {
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search query changes by 100ms before sending to Web Worker
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      computeWorkerClient.updateSearch(searchTerm);
    }, 100);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className="search-bar-wrapper" style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
      <input
        type="text"
        className="search-input"
        placeholder="Search projects (e.g. 'Tata Cloud Italy')..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label="Fuzzy search telemetry database"
        style={{
          width: '100%',
          height: '100%',
          padding: '8px 36px 8px 12px',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.85rem',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          background: 'rgba(30, 41, 59, 0.4)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'all 0.2s ease-in-out'
        }}
      />
      
      {searchTerm && (
        <button 
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '10px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            padding: '4px'
          }}
          aria-label="Clear search query"
        >
          ✕
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

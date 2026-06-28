/** Feature 7: Multi-choice categorical dropdown filters for department, industry, and automation type. */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { selectFilterOptions } from '../../selectors/selectFilterOptions.js';
import { computeWorkerClient } from '../../engine/computeWorkerClient.js';
import { on } from '../../engine/eventBus.js';

export const FilterBar = React.memo(() => {
  const [options, setOptions] = useState({ automationTypes: [], departments: [], industries: [] });
  const [activeDropdown, setActiveDropdown] = useState(null); // 'type' | 'dept' | 'ind' | null

  // Selected lists
  const [selections, setSelections] = useState({
    automation_type: [],
    department: [],
    industry: []
  });

  const dropdownRef = useRef(null);

  // Populate options once the initial CSV is parsed and loaded
  useEffect(() => {
    const loadOptions = () => {
      setOptions(selectFilterOptions());
    };

    const unsubscribe = on('STATE_UPDATED', loadOptions);
    loadOptions(); // Try loading immediately

    return unsubscribe;
  }, []);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown(prev => prev === name ? null : name);
  };

  const handleCheckboxChange = (category, value) => {
    setSelections(prev => {
      const activeList = prev[category];
      const isSelected = activeList.includes(value);
      const updatedList = isSelected
        ? activeList.filter(item => item !== value)
        : [...activeList, value];

      const newSelections = {
        ...prev,
        [category]: updatedList
      };

      // Dispatch to worker client off the main thread
      computeWorkerClient.updateFilters(newSelections);

      return newSelections;
    });
  };

  const clearCategory = (category) => {
    setSelections(prev => {
      const newSelections = {
        ...prev,
        [category]: []
      };
      computeWorkerClient.updateFilters(newSelections);
      return newSelections;
    });
  };

  return (
    <div className="filter-bar panel-glass" ref={dropdownRef} style={{ display: 'flex', gap: '16px', padding: '12px 16px', alignItems: 'center' }}>
      <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)' }}>FILTERS:</span>

      {/* Category: Automation Type */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          className={`filter-dropdown-btn ${selections.automation_type.length ? 'active' : ''}`}
          onClick={() => toggleDropdown('type')}
        >
          Automation Type {selections.automation_type.length > 0 && `(${selections.automation_type.length})`}
        </button>
        {activeDropdown === 'type' && (
          <div className="filter-dropdown-menu align-right">
            <div className="filter-menu-header">
              <span>Select Types</span>
              {selections.automation_type.length > 0 && (
                <button onClick={() => clearCategory('automation_type')}>Clear</button>
              )}
            </div>
            <div className="filter-menu-list">
              {options.automationTypes.map(type => (
                <label key={type} className="filter-item">
                  <input
                    type="checkbox"
                    checked={selections.automation_type.includes(type)}
                    onChange={() => handleCheckboxChange('automation_type', type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category: Department */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          className={`filter-dropdown-btn ${selections.department.length ? 'active' : ''}`}
          onClick={() => toggleDropdown('dept')}
        >
          Department {selections.department.length > 0 && `(${selections.department.length})`}
        </button>
        {activeDropdown === 'dept' && (
          <div className="filter-dropdown-menu align-right">
            <div className="filter-menu-header">
              <span>Select Departments</span>
              {selections.department.length > 0 && (
                <button onClick={() => clearCategory('department')}>Clear</button>
              )}
            </div>
            <div className="filter-menu-list">
              {options.departments.map(dept => (
                <label key={dept} className="filter-item">
                  <input
                    type="checkbox"
                    checked={selections.department.includes(dept)}
                    onChange={() => handleCheckboxChange('department', dept)}
                  />
                  <span>{dept}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category: Industry */}
      <div className="filter-dropdown-wrapper" style={{ position: 'relative' }}>
        <button
          className={`filter-dropdown-btn ${selections.industry.length ? 'active' : ''}`}
          onClick={() => toggleDropdown('ind')}
        >
          Industry {selections.industry.length > 0 && `(${selections.industry.length})`}
        </button>
        {activeDropdown === 'ind' && (
          <div className="filter-dropdown-menu align-right">
            <div className="filter-menu-header">
              <span>Select Industries</span>
              {selections.industry.length > 0 && (
                <button onClick={() => clearCategory('industry')}>Clear</button>
              )}
            </div>
            <div className="filter-menu-list">
              {options.industries.map(ind => (
                <label key={ind} className="filter-item">
                  <input
                    type="checkbox"
                    checked={selections.industry.includes(ind)}
                    onChange={() => handleCheckboxChange('industry', ind)}
                  />
                  <span>{ind}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

FilterBar.displayName = 'FilterBar';

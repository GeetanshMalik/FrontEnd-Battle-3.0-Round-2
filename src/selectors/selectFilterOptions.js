/** Pure selector extracting unique categorical choices from the raw state engine pool. */

import { stateEngine } from '../engine/stateEngine.js';

/**
 * Scans the master state pool to extract unique filter choices.
 */
export const selectFilterOptions = () => {
  const rows = stateEngine.getRows();
  const automationTypes = new Set();
  const departments = new Set();
  const industries = new Set();

  const size = rows.length;
  for (let i = 0; i < size; i++) {
    const row = rows[i];
    if (row.automation_type) automationTypes.add(row.automation_type);
    if (row.department) departments.add(row.department);
    if (row.industry) industries.add(row.industry);
  }

  return {
    automationTypes: Array.from(automationTypes).sort(),
    departments: Array.from(departments).sort(),
    industries: Array.from(industries).sort()
  };
};

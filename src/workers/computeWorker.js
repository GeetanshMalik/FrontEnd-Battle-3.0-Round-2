/** Worker thread script executing off-main-thread search, filter, and compound sorting. */

const workerPool = new Map();
let processedList = []; // Active filtered + searched + sorted array

// Query States
const queryState = {
  filters: {
    automation_type: [],
    department: [],
    industry: []
  },
  searchQuery: [], // Array of lowercase search tokens
  sortKeys: [] // Array of { col, dir }
};

// Helper: build space-joined search index to support O(1) keyword includes lookup
const buildSearchIndex = (row) => {
  return [
    row.project_name || '',
    row.company_id || '',
    row.implementation_partner || '',
    row.country || ''
  ]
    .join(' ')
    .toLowerCase();
};

// Helper: check if a row matches the current filters and search tokens
const matchesQuery = (row) => {
  const { filters, searchQuery } = queryState;

  // 1. Categorical Filters
  if (filters.automation_type.length && !filters.automation_type.includes(row.automation_type)) {
    return false;
  }
  if (filters.department.length && !filters.department.includes(row.department)) {
    return false;
  }
  if (filters.industry.length && !filters.industry.includes(row.industry)) {
    return false;
  }

  // 2. Fuzzy Search Match
  if (searchQuery.length) {
    const size = searchQuery.length;
    for (let i = 0; i < size; i++) {
      if (!row._searchIndex.includes(searchQuery[i])) {
        return false;
      }
    }
  }

  return true;
};

// Helper: Compound Comparator walking active sort keys
const compoundComparator = (a, b) => {
  const { sortKeys } = queryState;
  const size = sortKeys.length;
  
  for (let i = 0; i < size; i++) {
    const { col, dir } = sortKeys[i];
    let valA = a[col];
    let valB = b[col];

    // Determine type for proper comparisons
    const isNum = ['budget_usd', 'roi_percent', 'annual_savings_usd', 'robots_deployed', 'employee_hours_saved'].includes(col);
    if (isNum) {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    } else {
      valA = valA ? String(valA).toLowerCase() : '';
      valB = valB ? String(valB).toLowerCase() : '';
    }

    if (valA < valB) return dir === 'asc' ? -1 : 1;
    if (valA > valB) return dir === 'asc' ? 1 : -1;
  }
  return 0;
};

// Binary Search Insertion helper to insert item in-place in sorted array
const binarySearchInsert = (array, item, compareFn) => {
  let low = 0;
  let high = array.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (compareFn(array[mid], item) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  array.splice(low, 0, item);
};

// Runs the full filter -> search -> sort pipeline over the complete pool
const runFullPipeline = () => {
  const result = [];
  const rows = Array.from(workerPool.values());
  const size = rows.length;

  for (let i = 0; i < size; i++) {
    const row = rows[i];
    if (matchesQuery(row)) {
      result.push(row);
    }
  }

  // Sort if keys exist
  if (queryState.sortKeys.length > 0) {
    result.sort(compoundComparator);
  }

  processedList = result;
  dispatchResults();
};

// Sends results back to the main thread (transfers only UIDs to minimize GC overhead and structured clone costs)
const dispatchResults = () => {
  const uids = [];
  const size = processedList.length;
  for (let i = 0; i < size; i++) {
    uids.push(processedList[i].internal_uid);
  }
  self.postMessage({
    type: 'RESULTS',
    payload: { visibleRows: uids }
  });
};

// Message Handler
self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT': {
      const { fullPool } = payload;
      workerPool.clear();
      
      const size = fullPool.length;
      for (let i = 0; i < size; i++) {
        const row = fullPool[i];
        row._searchIndex = buildSearchIndex(row);
        workerPool.set(row.internal_uid, row);
      }
      
      console.log(`[Worker] Initialized cached pool with ${workerPool.size} rows.`);
      runFullPipeline();
      break;
    }
    
    case 'PATCH': {
      const { batch } = payload;
      const size = batch.length;
      
      for (let i = 0; i < size; i++) {
        const row = batch[i];
        row._searchIndex = buildSearchIndex(row);
        workerPool.set(row.internal_uid, row);

        // Incremental sort update: find old position, splice out, re-insert
        const oldIndex = processedList.findIndex(r => r.internal_uid === row.internal_uid);
        if (oldIndex !== -1) {
          processedList.splice(oldIndex, 1);
        }

        // Re-insert only if it matches current filter & search
        if (matchesQuery(row)) {
          if (queryState.sortKeys.length > 0) {
            binarySearchInsert(processedList, row, compoundComparator);
          } else {
            // Unsorted: append or insert
            if (oldIndex !== -1) {
              processedList.splice(oldIndex, 0, row); // Insert back where it was
            } else {
              processedList.push(row);
            }
          }
        }
      }
      
      dispatchResults();
      break;
    }

    case 'FILTER_CHANGE': {
      queryState.filters = {
        ...queryState.filters,
        ...payload.filters
      };
      runFullPipeline();
      break;
    }

    case 'SEARCH_CHANGE': {
      const { query } = payload;
      queryState.searchQuery = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      runFullPipeline();
      break;
    }

    case 'SORT_CHANGE': {
      const { sortKeys } = payload;
      queryState.sortKeys = sortKeys;
      runFullPipeline();
      break;
    }
    
    case 'EXPORT_REQUEST': {
      const escapeCSV = (val) => {
        if (val === undefined || val === null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const formatCurrency = (val) => {
        const num = parseFloat(val) || 0;
        return `$${Math.round(num).toLocaleString('en-US')}`;
      };

      const formatPercent = (val) => {
        const num = parseFloat(val) || 0;
        return `${num.toFixed(2)}%`;
      };

      const formatInteger = (val) => {
        const num = parseInt(val, 10) || 0;
        return num.toLocaleString('en-US');
      };

      const headers = [
        'Project ID',
        'Project Name',
        'Automation Type',
        'Department',
        'Industry',
        'Robots',
        'Budget',
        'Savings',
        'ROI',
        'Hours Saved',
        'Status'
      ];

      const csvRows = [headers.map(h => `"${h}"`).join(',')];
      const size = processedList.length;

      for (let i = 0; i < size; i++) {
        const row = processedList[i];
        const line = [
          escapeCSV(row.project_id),
          escapeCSV(row.project_name),
          escapeCSV(row.automation_type),
          escapeCSV(row.department),
          escapeCSV(row.industry),
          escapeCSV(formatInteger(row.robots_deployed)),
          escapeCSV(formatCurrency(row.budget_usd)),
          escapeCSV(formatCurrency(row.annual_savings_usd)),
          escapeCSV(formatPercent(row.roi_percent)),
          escapeCSV(formatInteger(row.employee_hours_saved)),
          escapeCSV(row.project_status ? String(row.project_status).toUpperCase() : '')
        ];
        csvRows.push(line.join(','));
      }

      const csvString = csvRows.join('\n');
      self.postMessage({
        type: 'EXPORT_RESPONSE',
        payload: { csvString }
      });
      break;
    }

    default:
      console.warn(`[Worker] Unknown event type received: ${type}`);
  }
};

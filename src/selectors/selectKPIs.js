/** Pure selector formatting raw metrics values for display in the KPI dashboard. */

import { formatInteger, formatCurrency } from '../utils/formatters.js';

/**
 * Maps and sanitizes the metrics engine snapshot into formatted display metrics.
 */
export const selectKPIs = (metricsSnapshot) => {
  return {
    totalRowsProcessed: formatInteger(metricsSnapshot.totalRowsProcessed),
    totalRobotsDeployed: formatInteger(metricsSnapshot.totalRobotsDeployed),
    globalSavings: formatCurrency(metricsSnapshot.globalSavings)
  };
};

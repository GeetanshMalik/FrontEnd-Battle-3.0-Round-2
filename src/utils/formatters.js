/** Feature 2: Value Sanitation Formatters for currency and percentage clamping. */

// Cache formatter instances to prevent recreation overhead
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

/**
 * Format a number to USD Currency string (e.g. $1,069,470)
 */
export const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '$0';
  return currencyFormatter.format(num);
};

/**
 * Format a number to clamped 2dp percentage (e.g. 54.20%)
 */
export const formatPercent = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '0.00%';
  return `${num.toFixed(2)}%`;
};

/**
 * Format a number as comma-separated integer (e.g. 50,000)
 */
export const formatInteger = (value) => {
  const num = typeof value === 'number' ? value : parseInt(value, 10);
  if (isNaN(num)) return '0';
  return integerFormatter.format(num);
};

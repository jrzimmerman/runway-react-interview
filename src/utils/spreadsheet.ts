// src/utils/spreadsheet.ts

/**
 * Converts a zero-based column index into spreadsheet-like labels (A, B, ..., Z, AA, AB, ...).
 * This is a base-26-like conversion, where 0 -> A, 25 -> Z, 26 -> AA.
 * @param index The 0-based column index.
 * @returns The column label as an uppercase string.
 */
export const getColumnLabel = (index: number): string => {
  let label = '';
  let temp = index + 1;
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    temp = Math.floor((temp - 1) / 26);
  }
  return label;
};

/**
 * Checks if a string represents a numeric value.
 * This is used to determine whether a cell's value should be formatted as currency.
 * It trims whitespace and uses `isFinite(Number(...))` for robust checking,
 * which correctly handles integers, decimals, and signs, while rejecting empty or mixed strings.
 * @param value The string to check.
 * @returns True if the string is numeric, false otherwise.
 */
export const isNumeric = (value: string): boolean => {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return false;
  }
  return isFinite(Number(trimmedValue));
};

/**
 * Formats a numeric string as a USD currency string (e.g., "$1,234.56").
 * It uses the `Intl.NumberFormat` API for locale-aware formatting.
 * If the value is not numeric or is empty, it returns the original value unchanged
 * to ensure non-numeric data is displayed as-is.
 * @param value The string value to format.
 * @returns The formatted currency string or the original value.
 */
export const formatCurrency = (value: string): string => {
  if (value === '' || !isNumeric(value)) {
    return value;
  }
  const numericValue = Number(value.trim());
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
};

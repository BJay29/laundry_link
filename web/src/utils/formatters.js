/**
 * Utility functions for formatting data across the LaundryLink application.
 */

/**
 * Formats an ISO date string or Date object into a readable time format.
 * Used for tracking booking times in the Service Terminal.
 * Example: "2026-05-05T14:30:00" -> "02:30 PM"
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return '--:-- --';
  
  const d = new Date(date);
  
  // Validate date object to prevent "Invalid Date" output in UI
  if (isNaN(d.getTime())) return '--:-- --';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats a number into a Philippine Peso currency format.
 * Example: 350 -> "₱350" or 350.5 -> "₱350.50"
 * 
 * @param {number} amount - The numeric value to format
 * @returns {string} - Formatted currency string (PHP)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₱0';

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    // Set to 0 if you prefer whole numbers for standard laundry rates
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a date into a clean, long-form date string.
 * Used for the header sections and historical logs.
 * Example: "2026-05-05" -> "May 05, 2026"
 * 
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

/**
 * Helper to get the current date in a format compatible with local storage or headers.
 * Returns: "May 05, 2026"
 */
export const getCurrentDateFormatted = () => {
  return formatDate(new Date());
};

export default {
  formatTime,
  formatCurrency,
  formatDate,
  getCurrentDateFormatted
};
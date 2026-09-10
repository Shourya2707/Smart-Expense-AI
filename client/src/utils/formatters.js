/**
 * Format a number as Indian Rupee (₹) currency string
 * @param {number|string} amount
 * @param {number} decimals
 * @returns {string}
 */
export const formatCurrency = (amount, decimals = 2) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format a date string into a user-friendly format (e.g. "02 Sep 2026")
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 * @param {string|Date} dateStr
 * @returns {string}
 */
export const formatInputDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
};

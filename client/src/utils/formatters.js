/**
 * Currency & date formatters — INR locale.
 * Uses Intl so output respects the user's runtime locale.
 */

/** Format a number as Indian Rupee (₹) currency */
export const formatCurrency = (amount, decimals = 2) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/** Format a date string for display (e.g. "02 Sep 2026") */
export const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Local YYYY-MM-DD for <input type="date"> — never toISOString (UTC shift). */
export const formatInputDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return localISO(now);
  }
  return localISO(d);
};

/** Format a Date using its LOCAL calendar parts (timezone-safe). */
export const localISO = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Today's local date as YYYY-MM-DD. */
export const todayISO = () => localISO(new Date());

/** Resolve a natural-language date ("yesterday") to YYYY-MM-DD. */
export const resolveDateWord = (text) => {
  if (/\byesterday\b/i.test(text)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localISO(d);
  }
  const match = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return match ? match[0] : todayISO();
};

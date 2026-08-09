import { DEFAULT_CURRENCY_SYMBOL } from '@/lib/constants';

/**
 * Format a number as currency.
 * @param amount - The amount to format
 * @param symbol - Currency symbol (default: ৳)
 * @returns Formatted string like "৳8,500"
 */
export function formatCurrency(amount: number, symbol: string = DEFAULT_CURRENCY_SYMBOL): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  return `${symbol}${formatted}`;
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a time string (HH:mm) to 12-hour format.
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Generate a UUID v4.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate percentage with bounds.
 */
export function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

/**
 * Round to N decimal places.
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current day of week.
 */
export function getCurrentDay(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

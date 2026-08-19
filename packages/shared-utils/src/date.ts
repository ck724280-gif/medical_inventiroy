import { BatchStatus } from '@medical-inventory/shared-types';

/**
 * Formats a Date object to DD-MM-YYYY or configured format.
 */
export function formatDate(date: Date | string, format = 'DD-MM-YYYY'): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'MM-YYYY') return `${month}-${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}-${month}-${year}`;
}

/**
 * Formats Date + Time (DD-MM-YYYY HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const dateStr = formatDate(d);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 => 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${dateStr} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Calculates number of days between now and expiry date.
 */
export function getDaysUntilExpiry(expiryDate: Date | string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a batch is expired.
 */
export function isBatchExpired(expiryDate: Date | string): boolean {
  return getDaysUntilExpiry(expiryDate) < 0;
}

/**
 * Determines appropriate batch status based on expiry date.
 */
export function evaluateBatchStatus(
  expiryDate: Date | string,
  currentStatus: BatchStatus
): BatchStatus {
  if (currentStatus === BatchStatus.BLOCKED ||
      currentStatus === BatchStatus.QUARANTINED ||
      currentStatus === BatchStatus.RECALLED) {
    return currentStatus;
  }

  if (isBatchExpired(expiryDate)) {
    return BatchStatus.EXPIRED;
  }

  return BatchStatus.ACTIVE;
}

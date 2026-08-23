import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robustly extracts an array from any API response envelope
 * ({ success: true, data: { data: [...] } } | { data: [...] } | [...])
 */
export function extractDataArray<T = any>(response: any): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.data)) return response.data.data;
  if (Array.isArray(response.items)) return response.items;
  if (Array.isArray(response.data?.items)) return response.data.items;
  if (Array.isArray(response.result)) return response.result;
  if (Array.isArray(response.data?.result)) return response.data.result;
  return [];
}

/**
 * Extracts total count from API response metadata with fallback to array length
 */
export function extractTotalCount(response: any, fallbackLength: number = 0): number {
  if (!response) return fallbackLength;
  const count =
    response.meta?.total ??
    response.data?.meta?.total ??
    response.total ??
    response.data?.total ??
    response.count ??
    response.data?.count;
  return typeof count === 'number' ? count : fallbackLength;
}

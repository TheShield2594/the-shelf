import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    want_to_read: 'Want to Read',
    currently_reading: 'Currently Reading',
    finished: 'Finished',
    dnf: 'DNF',
  };
  return labels[status] || status;
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    want_to_read: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    currently_reading: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    finished: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    dnf: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return colors[status] || 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
}

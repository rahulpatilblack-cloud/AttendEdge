// src/lib/date-utils.ts
export const formatDate = (date: string | Date | null | undefined, formatStr = 'MMM d, yyyy'): string => {
  if (!date) return '-';
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return '-';
  }
};
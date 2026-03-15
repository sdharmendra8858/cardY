/**
 * Formats a date or timestamp to DD/MM/YYYY
 * 
 * @param date The date object or timestamp (number)
 * @returns Formatted date string
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

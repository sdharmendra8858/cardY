/**
 * Format seconds into MM:SS string
 * 
 * @param seconds Seconds to format
 * @returns Formatted string (e.g., "05:30")
 */
export function formatTimeMMSS(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

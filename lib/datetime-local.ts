/** Format a Date for `<input type="datetime-local" />` in the user's local timezone. */
export function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  if (d == null) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

import { toAppDatetimeLocalValue } from "@/lib/timezone";

/** Format a Date for `<input type="datetime-local" />` in the app timezone. */
export function toDatetimeLocalValue(d: Date | string | null | undefined): string {
  return toAppDatetimeLocalValue(d);
}

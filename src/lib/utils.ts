import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relative time in Hebrew, e.g. "לפני 3 שעות" / "לפני 2 ימים". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "הרגע";
  if (min < 60) return `לפני ${min} ד׳`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `לפני ${hours} ש׳`;
  const days = Math.round(hours / 24);
  return `לפני ${days} ימים`;
}

/** Whole hours elapsed since an ISO timestamp. */
export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3_600_000;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Shared ₪ formatter — single source so every screen renders amounts identically. */
export function formatCurrency(n: number | undefined | null): string {
  return n == null ? "—" : `₪${Math.round(n).toLocaleString("he-IL")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
}

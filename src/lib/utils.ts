import { type ClassValue, clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { format, formatInTimeZone, toZonedTime } from "date-fns-tz";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date) => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = toZonedTime(date, userTimeZone);

  const utcDateTime = formatInTimeZone(
    new Date(date.toISOString()),
    "UTC",
    "MMMM d, yyyy HH:mm:ss",
  );

  const localDateTime = format(localDate, "MMMM d, yyyy HH:mm:ss", {
    timeZone: userTimeZone,
  });

  const gmtOffset = format(localDate, "zzz", {
    timeZone: userTimeZone,
  });

  return {
    timeAgo: formatDistanceToNow(date, { addSuffix: true }),
    utcDateTime,
    localDateTime,
    localTimeZone: gmtOffset,
  };
};

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

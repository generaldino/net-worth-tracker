import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// lib/utils.ts
export function formatDate(dateString: string | Date | null): string {
  if (!dateString) return "Unknown date";

  // Try to create a valid date object
  let date: Date;
  try {
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      // Try to parse it as a string
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    return "Invalid date";
  }

  const now = new Date();

  // Calculate time difference in milliseconds
  const diffMs = now.getTime() - date.getTime();

  // Convert to days
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Check if the date is from today (same day)
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  // If from today, show hours
  if (isToday) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      return "just now";
    } else {
      return `${diffHours}h`;
    }
  }
  // If less than a week
  else if (diffDays < 7) {
    return `${diffDays}d`;
  }
  // If less than a month (approximating a month as 30 days)
  else if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks}w`;
  }
  // If older than a month, use the original date format
  else {
    return new Intl.DateTimeFormat("en-UK", {
      year: "numeric",
      month: "short",
    }).format(date);
  }
}

export function formatCarMake(carMake: string): string {
  if (!carMake) return "";

  // Split by underscore and capitalize each word
  return carMake
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

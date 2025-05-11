import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
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
      day: "numeric",
    }).format(date);
  }
}

export function getCategoryEmoji(category: string): string {
  const categoryMap: Record<string, string> = {
    Cars: "🚗",
    Gaming: "🎮",
    California: "🌴",
    "New York": "🗽",
    Texas: "🤠",
    Florida: "🌊",
    Hawaii: "🌺",
    Nevada: "🎰",
    Arizona: "🌵",
    Tennessee: "🎵",
    Kentucky: "🐎",
    Louisiana: "🎺",
    Vintage: "🕰️",
    Modern: "🔷",
    Custom: "🔧",
    Vanity: "✨",
    "Special Edition": "🏆",
    Commemorative: "🏛️",
    "Sunset Design": "🌅",
    Rainbow: "🌈",
    Orange: "🍊",
    Space: "🚀",
    Music: "🎵",
    Jazz: "🎷",
    Derby: "🏇",
    Horses: "🐴",
    "Las Vegas": "🎲",
    "Grand Canyon": "🏞️",
    "Statue of Liberty": "🗽",
    "Sunshine State": "☀️",
    "Empire State": "🏙️",
    nice: "👍",
    fish: "🐟",
  };

  return categoryMap[category] || "🚗";
}

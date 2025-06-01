/**
 * Returns the site URL based on the current environment
 * In development: http://localhost:3000
 * In production: https://v0-wealth-tracker-green.vercel.app
 */
export function getSiteUrl(): string {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    return "http://localhost:3000";
  }

  return "https://v0-wealth-tracker-green.vercel.app";
}

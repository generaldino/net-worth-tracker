import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// In-memory rate limiting (simple approach for serverless)
// Note: This works per-instance. For distributed rate limiting across multiple
// serverless instances, consider using Redis or Vercel's edge config
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Allow up to 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verify secret token
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.KEEP_ALIVE_SECRET_TOKEN;

    if (!expectedToken) {
      console.error("KEEP_ALIVE_SECRET_TOKEN environment variable is not set");
      return NextResponse.json(
        { error: "Service misconfigured" },
        { status: 500 }
      );
    }

    // Support both Authorization header and query parameter (for GitHub Actions flexibility)
    const token =
      authHeader?.replace("Bearer ", "") ||
      request.nextUrl.searchParams.get("token");

    if (!token || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 3. Make minimal database query to keep connection alive
    // This will wake up the Neon database if it's in a suspended state
    // We use a simple SELECT query that doesn't depend on any tables
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        message: "Keep-alive ping successful",
      },
      { status: 200 }
    );
  } catch (error) {
    // Log error but don't expose details
    console.error("Keep-alive endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

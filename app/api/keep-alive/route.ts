import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // 3. Make minimal Supabase query to keep connection alive
    const supabase = createClient();

    // Make a simple query to Supabase REST API
    // This will wake up the Supabase project if it's paused
    // We use a query that will fail gracefully but still establish a connection
    await supabase.from("_keep_alive_ping").select("1").limit(0).single();

    // We expect an error (table doesn't exist), but the connection attempt
    // is what matters - it wakes up Supabase from auto-pause
    // The error is expected and harmless, so we don't need to handle it

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

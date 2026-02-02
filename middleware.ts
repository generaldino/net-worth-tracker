import { NextResponse } from "next/server";

export async function middleware() {
  // Note: Auth checks are handled at the page/API route level
  // Middleware just allows requests through since database sessions
  // require Node.js runtime which is not available in Edge Runtime
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

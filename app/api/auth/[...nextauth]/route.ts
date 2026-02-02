import { handlers } from "@/lib/auth";

// Force Node.js runtime for database adapter compatibility
export const runtime = "nodejs";

export const { GET, POST } = handlers;

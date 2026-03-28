import { NextResponse } from "next/server";

// Dashboard access is already protected in server components via `auth()`
// inside the dashboard layout/pages. Keeping middleware edge-safe avoids
// importing the Prisma-backed Auth.js setup into the Edge runtime.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

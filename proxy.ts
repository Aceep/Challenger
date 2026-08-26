import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * Optimistic redirect only (cookie-based). Real authorization lives in lib/dal.ts,
 * checked again in every page, Server Action and Route Handler.
 */
export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/login" || pathname.startsWith("/api/auth") || pathname.startsWith("/api/discord");
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};

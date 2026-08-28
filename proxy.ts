import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only, based on the presence of the Auth.js session cookie —
 * no JWT decoding, no database. Real authorization lives in lib/dal.ts and is
 * checked again in every page, Server Action and Route Handler.
 */
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth") || pathname.startsWith("/api/discord") || pathname.startsWith("/api/cron") || pathname === "/demo" || pathname.startsWith("/demo/");

  // Landing: static page for visitors; signed-in players go straight to their home.
  if (pathname === "/") {
    return hasSession ? NextResponse.redirect(new URL("/home", req.nextUrl.origin)) : NextResponse.next();
  }
  if (!hasSession && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|svg|jpg|ico)$).*)"],
};

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

export default async function middleware(req: NextRequest) {
  const isBypassMode =
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_BYPASS?.toLocaleLowerCase() === "true";
  if (isBypassMode) {
    return NextResponse.next();
  }

  const session = await auth();
  const isAuthenticated = !!session;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const protectedPages = ["/agents", "/dashboard", "/log-analyzer", "/reports"];
  const isProtectedPages = protectedPages.some((page) =>
    req.nextUrl.pathname.startsWith(page),
  );

  /* go to dashboard if access login page, and already authenticated */
  if (isAuthPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  /* if access protected pages, redirect to login */
  if (!isAuthenticated && isProtectedPages) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};

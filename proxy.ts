import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public — always allow
  if (pathname === "/" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Auth pages — redirect to dashboard if already logged in
  if (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // All other routes — require auth
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session?.user?.role ?? "";

  if (pathname.startsWith("/admin")) {
    const modAllowedAdminPath = pathname === "/admin/users" || pathname === "/admin/quizzes";
    if (role !== "ADMIN" && !(role === "MOD" && modAllowedAdminPath)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (
    pathname.startsWith("/instructor") &&
    role !== "INSTRUCTOR" &&
    role !== "ADMIN"
  ) {
    const modAllowedInstructorPath = pathname === "/instructor/upload" || pathname === "/instructor/quizzes";
    if (role === "MOD" && modAllowedInstructorPath) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";

// Authentication has been removed, so no frontend routes are protected.
// const protectedRoutes = ["/dashboard", "/admin", "/designer", "/developer", "/create", "/prompt-editor", "/prompts", "/generations", "/generate"];

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

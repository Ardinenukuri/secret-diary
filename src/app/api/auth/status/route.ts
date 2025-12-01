import { cookies } from "next/headers";
import { NextResponse } from "next/server";


export async function GET() {
  const hasToken = (await cookies()).has("accessToken");
  return NextResponse.json({ isAuthenticated: hasToken });
}
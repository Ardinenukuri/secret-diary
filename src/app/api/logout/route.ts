import { NextResponse } from "next/server";
import { deleteCookie } from "cookies-next";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  deleteCookie("accessToken", {
    res,
    path: "/",
  });
  deleteCookie("refreshToken", {
    res,
    path: "/",
  });

  return res;
}

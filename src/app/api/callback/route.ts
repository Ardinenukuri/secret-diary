import { NextResponse } from "next/server";
import { setCookie } from "cookies-next";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const authBase = process.env.NEXT_PUBLIC_IAA_AUTH_URL;
    const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL;
    const clientId = process.env.NEXT_PUBLIC_IAA_CLIENT_ID;
    const clientSecret = process.env.IAA_CLIENT_SECRET;

    if (!authBase || !appBase || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Server env vars not configured" }, { status: 500 });
    }

    const tokenEndpoint = `${authBase}/api/auth/token`;
    const redirectUri = `${appBase}/api/callback`;

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.json({ error: "Token exchange failed", details: text }, { status: 502 });
    }

    const data = await tokenRes.json();
    const accessToken: string | undefined = data.access_token;
    const refreshToken: string | undefined = data.refresh_token;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "Tokens missing in response" }, { status: 502 });
    }

    const res = NextResponse.redirect(new URL("/dashboard", url));

    setCookie("accessToken", accessToken, {
      res,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    setCookie("refreshToken", refreshToken, {
      res,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: "Callback error", message: err?.message ?? String(err) }, { status: 500 });
  }
}

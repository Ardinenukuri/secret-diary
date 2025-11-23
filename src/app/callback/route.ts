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

    let authBase = process.env.NEXT_PUBLIC_IAA_AUTH_URL;
    const appBase = process.env.NEXT_PUBLIC_APP_BASE_URL;
    const clientId = process.env.NEXT_PUBLIC_IAA_CLIENT_ID;
    const clientSecret = process.env.IAA_CLIENT_SECRET;

    // Fallback to port 5000 if not set or if pointing to wrong port
    if (!authBase || authBase.includes(':3000')) {
      console.warn(`[callback] NEXT_PUBLIC_IAA_AUTH_URL is ${authBase || 'not set'}, defaulting to http://localhost:5000`);
      authBase = 'http://localhost:5000';
    }

    if (!appBase || !clientId || !clientSecret) {
      return NextResponse.json({ error: "Server env vars not configured", missing: { appBase: !appBase, clientId: !clientId, clientSecret: !clientSecret } }, { status: 500 });
    }

    const redirectUri = `${appBase}/callback`;
    
    // IAA backend expects code as query parameter, client credentials in body
    const tokenEndpoint = `${authBase}/api/auth/tokens?code=${encodeURIComponent(code)}`;

    console.log(`[callback] Exchanging code for tokens at: ${tokenEndpoint}`);
    console.log(`[callback] Code: ${code.substring(0, 20)}...`);
    console.log(`[callback] Redirect URI: ${redirectUri}`);
    console.log(`[callback] Client ID: ${clientId}`);

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(text);
      } catch {
        errorDetails = text;
      }
      console.error(`[callback] Token exchange failed: ${tokenRes.status}`);
      console.error(`[callback] Error response:`, errorDetails);
      console.error(`[callback] Request was to: ${tokenEndpoint}`);
      return NextResponse.json({ 
        error: "Token exchange failed", 
        details: errorDetails, 
        status: tokenRes.status,
        endpoint: tokenEndpoint
      }, { status: 502 });
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


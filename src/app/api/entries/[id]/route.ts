import { NextRequest, NextResponse } from "next/server";

function getBackendBase() {
  const base = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:4000";
  return base.replace(/\/$/, "");
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get("accessToken")?.value;
  if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.text();

  const r = await fetch(`${getBackendBase()}/entries/${params.id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body,
  });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json" } });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get("accessToken")?.value;
  if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const r = await fetch(`${getBackendBase()}/entries/${params.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json" } });
}

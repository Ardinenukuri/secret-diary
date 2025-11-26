import { NextRequest, NextResponse } from "next/server";

function getBackendBase() {
  const base = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:4000";
  return base.replace(/\/$/, "");
}

async function handleRequest(
  req: NextRequest,
  { params, method }: { params: { id: string }, method: 'PUT' | 'DELETE' }
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });
  }

  const url = `${getBackendBase()}/entries/${params.id}`;
  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
  };

  try {
    const body = method === 'PUT' ? await req.text() : undefined;
    
    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    const text = await response.text();
    return new NextResponse(text, { 
      status: response.status, 
      headers: { 
        'content-type': response.headers.get('content-type') || 'application/json' 
      } 
    });
  } catch (error) {
    console.error(`[API] Error in ${method} /api/entries/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRequest(req, { params, method: 'PUT' });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return handleRequest(req, { params, method: 'DELETE' });
}

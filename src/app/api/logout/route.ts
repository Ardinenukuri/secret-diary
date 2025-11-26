import { NextResponse } from "next/server";

export async function POST() {
  // Create a response with a script that will handle client-side cleanup
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Logging out...</title>
        <script>
          // Clear all auth-related data from localStorage
          localStorage.removeItem('auth_tokens');
          localStorage.removeItem('iaa_authenticated');
          
          // Redirect to home page after clearing storage
          window.location.href = '/';
        </script>
      </head>
      <body>
        <p>Logging you out...</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

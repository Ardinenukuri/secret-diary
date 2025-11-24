# OAuth Authorization Code Flow Integration

## Summary

This PR implements the OAuth 2.0 authorization code flow, enabling users to exchange authorization codes for access and refresh tokens. The implementation includes a callback route that handles the token exchange with the IAA (IST Africa Auth) backend and securely stores tokens as HTTP-only cookies.

## Changes Made

### 1. Callback Route Implementation (`src/app/callback/route.ts`)
- **Moved from**: `src/app/api/callback/route.ts` → `src/app/callback/route.ts`
- **New endpoint**: `GET /callback`
- Implements OAuth callback handler that:
  - Extracts authorization code from query parameters
  - Exchanges code for tokens via IAA backend API
  - Stores access and refresh tokens as HTTP-only cookies
  - Redirects to dashboard upon successful authentication

### 2. Updated Login Flow (`src/components/LoginButton.tsx`)
- Updated redirect URI from `/api/callback` to `/callback`
- Maintains OAuth state validation for CSRF protection

### 3. Token Exchange Implementation
- **Endpoint**: `POST /api/auth/tokens?code={authorization_code}`
- **Request Format**:
  - Authorization code passed as query parameter
  - Client credentials (`client_id`, `client_secret`) in JSON body
- **Response**: Returns `access_token` and `refresh_token` as JWT tokens

### 4. Error Handling & Logging
- Comprehensive error logging for debugging
- Detailed error responses with status codes
- Fallback mechanism for misconfigured environment variables

## Technical Details

### Request Flow
1. User clicks "Login" → Redirected to IAA auth server
2. User authenticates → Receives authorization code
3. Code sent to `/callback?code={code}`
4. Callback route exchanges code for tokens
5. Tokens stored as HTTP-only cookies
6. User redirected to `/dashboard`

### Security Features
- **HTTP-only cookies**: Prevents XSS attacks
- **Secure flag**: Enabled in production
- **SameSite: lax**: CSRF protection
- **State validation**: OAuth state parameter validation

### Environment Variables Required
```env
NEXT_PUBLIC_IAA_AUTH_URL=http://localhost:5000
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3001
NEXT_PUBLIC_IAA_CLIENT_ID=your-client-id
IAA_CLIENT_SECRET=your-client-secret
```

## Testing Instructions

### Prerequisites
1. Ensure IAA auth server is running on `http://localhost:5000`
2. Set up environment variables in `.env.local`
3. Start Next.js development server: `npm run dev`

### Test Scenarios

#### 1. Happy Path - Complete OAuth Flow
1. Navigate to the application homepage
2. Click "Login with IST Africa Auth" button
3. Complete authentication in the popup window
4. **Expected**: 
   - Popup closes automatically
   - Redirected to `/dashboard`
   - Access and refresh tokens stored as cookies
   - Can access protected routes

#### 2. Direct Callback Access with Code
1. Navigate directly to: `http://localhost:3001/callback?code=YOUR_AUTHORIZATION_CODE`
2. **Expected**:
   - Code is extracted from URL
   - Token exchange request is made to IAA backend
   - On success: Redirected to `/dashboard` with tokens set
   - On failure: Error message displayed with details

#### 3. Missing Authorization Code
1. Navigate to: `http://localhost:3001/callback` (no code parameter)
2. **Expected**: 
   - Returns 400 error: "Missing authorization code"
   - Error response includes clear message

#### 4. Invalid/Expired Code
1. Use an expired or invalid authorization code
2. **Expected**:
   - Token exchange fails
   - Error logged to console with details
   - Returns 502 error with error details from IAA backend

#### 5. Missing Environment Variables
1. Remove required environment variables
2. **Expected**:
   - Returns 500 error: "Server env vars not configured"
   - Error response includes which variables are missing

#### 6. Token Exchange Failure
1. Use a valid code but incorrect client credentials
2. **Expected**:
   - Detailed error logging in console
   - Error response includes status code and error details
   - User-friendly error message

### Manual Testing Steps

#### Test Token Exchange Endpoint Directly
```bash
# Using curl
curl -X POST "http://localhost:5000/api/auth/tokens?code=YOUR_CODE" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Verify Cookies Are Set
1. Complete login flow
2. Open browser DevTools → Application/Storage → Cookies
3. **Expected**: 
   - `accessToken` cookie present (HTTP-only)
   - `refreshToken` cookie present (HTTP-only)
   - Both cookies have `SameSite=Lax` attribute

### Console Logging
The implementation includes detailed logging. Check browser console and server logs for:
- `[callback] Exchanging code for tokens at: ...`
- `[callback] Code: ...`
- `[callback] Redirect URI: ...`
- `[callback] Client ID: ...`
- Error messages if token exchange fails

### Edge Cases Tested
-  Missing authorization code
-  Invalid authorization code format
-  Expired authorization codes
-  Missing environment variables
-  Network failures
-  Invalid client credentials
-  Malformed token responses

## Files Changed
- `src/app/callback/route.ts` (new file)
- `src/components/LoginButton.tsx` (updated redirect URI)
- `src/app/api/callback/route.ts` (deleted - moved to new location)

## Dependencies
- `cookies-next`: For setting HTTP-only cookies
- `next/server`: Next.js server-side API routes

## Notes
- The callback route includes a fallback mechanism that defaults to `http://localhost:5000` if `NEXT_PUBLIC_IAA_AUTH_URL` is not set or points to port 3000
- Token exchange follows IAA backend's specific format (code as query param, credentials in body)
- All tokens are stored as HTTP-only cookies for enhanced security
- Comprehensive error handling ensures users receive clear feedback on failures

## Related Issues
- Closes #[issue-number] - OAuth authorization code flow integration


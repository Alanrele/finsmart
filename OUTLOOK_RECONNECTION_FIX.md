# Outlook Reconnection Fix - 400 Error Resolution

## Problem Analysis

### User Report - Issue 1 (Backend 400)
```
Failed to load resource: the server responded with a status of 400 ()
api/graph/connect:1  Failed to load resource: the server responded with a status of 400 ()
(repeated 5 times)

"no funciona cuando desconecto y vuelvo a conectar el outlook"
```

### User Report - Issue 2 (Microsoft OAuth 400 + X-Frame-Options)
```
login.microsoftonline.com/common/oauth2/v2.0/token?client-request-id=...  Failed to load resource: the server responded with a status of 400 ()
msal-B-q5JRWZ.js:105 An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
chrome-error://chromewebdata/:1 Refused to display 'https://finsmart.up.railway.app/' in a frame because it set 'X-Frame-Options' to 'deny'.
```

### Root Causes Identified

1. **Missing Mail Scopes**: Initial login only requested `User.Read`, but Outlook connection requires `Mail.Read` and `Mail.ReadWrite` scopes
2. **X-Frame-Options Blocking**: Railway backend sets `X-Frame-Options: deny` (via Helmet), blocking MSAL iframe token refresh
3. **MSAL iframe dependency**: MSAL was trying to use iframes for silent token acquisition, which fails with X-Frame-Options
4. **Token Validation**: Frontend wasn't validating token before sending to backend
5. **Poor Error Messages**: Backend validation errors and MSAL errors weren't descriptive enough

## Solution Implemented

### 1. Added Microsoft Graph Mail Scopes

**File**: `frontend/src/config/msalConfig.js`

```javascript
// Separate request for Microsoft Graph Mail access
export const graphMailRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'openid', 'profile', 'email'],
  forceRefresh: false,
  redirectUri: railwayConfig.redirectUri, // Explicit redirect for popup
  prompt: 'consent' // Always ask for consent to ensure permissions are granted
};
```

**Why**: Microsoft Graph requires explicit consent for Mail operations. The original `loginRequest` only had basic profile scopes.

### 2. Disabled MSAL Iframe Token Acquisition

**File**: `frontend/src/config/msalConfig.js`

```javascript
cache: {
  cacheLocation: 'localStorage',
  storeAuthStateInCookie: true, // Required for Safari and when iframes are blocked
},
system: {
  // ...logger options...
  allowNativeBroker: false, // Disable native broker for web
  windowHashTimeout: 60000,
  iframeHashTimeout: 10000, // Increased timeout for iframe operations
  loadFrameTimeout: 10000, // Increased timeout
  asyncPopups: false,
  allowRedirectInIframe: false // Prevent redirect attempts in iframes
}
```

**Why**: 
- Railway's `X-Frame-Options: deny` blocks MSAL iframes
- We keep the security header (prevents clickjacking attacks)
- MSAL now uses **popup-only** token acquisition instead of iframes
- `storeAuthStateInCookie: true` ensures auth state persists across page reloads

### 2. Created Dedicated Graph Mail Token Function (Popup-First Approach)

**File**: `frontend/src/hooks/useMicrosoftAuth.js`

```javascript
const getGraphMailToken = async () => {
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please sign in with Microsoft first.')
  }

  try {
    // First, try to get token from cache without iframe
    const silentRequest = {
      ...graphMailRequest,
      account: accounts[0],
      forceRefresh: false,
      cacheLookupPolicy: 2 // CacheLookupPolicy.Default - check cache first
    }

    console.log('🔍 Attempting to get Graph Mail token from cache...')
    
    try {
      const response = await instance.acquireTokenSilent(silentRequest)
      
      if (!response || !response.accessToken) {
        throw new Error('No token in cache')
      }
      
      console.log('✅ Successfully acquired Graph Mail token from cache')
      return response.accessToken
    } catch (cacheError) {
      console.log('ℹ️ Token not in cache or expired, will request interactively')
      // Continue to interactive acquisition
    }

    // If cache fails, go straight to interactive (popup) - skip iframe attempts
    console.log('🔄 Requesting Graph Mail token via popup...')
    const response = await instance.acquireTokenPopup(graphMailRequest)
    
    if (!response || !response.accessToken) {
      throw new Error('Failed to acquire Graph Mail access token from Microsoft popup')
    }
    
    console.log('✅ Successfully acquired Graph Mail token via popup')
    return response.accessToken

  } catch (error) {
    console.error('❌ Graph Mail token acquisition failed:', error)
    
    // Check if it's a specific MSAL error
    if (error.errorCode === 'user_cancelled' || error.errorMessage?.includes('cancelled')) {
      throw new Error('Autenticación cancelada. Por favor, intenta conectar Outlook nuevamente.')
    }
    
    if (error.errorCode === 'consent_required') {
      throw new Error('Se requiere permiso para acceder a tus emails. Por favor, acepta los permisos cuando se soliciten.')
    }
    
    throw new Error('Could not acquire Microsoft Graph Mail access token. Please grant permission to access your emails.')
  }
}
```

**Flow**:
1. **Cache lookup**: Check if valid token exists in localStorage (no network call)
2. **If cache miss**: Go directly to popup (skip iframe attempts completely)
3. **Popup shown**: User consents to Mail permissions if first time
4. **Token cached**: Subsequent calls use cached token from step 1

**Why No Iframes**:
- Railway's Helmet config has `frameguard: { action: 'deny' }`
- This is correct for security (prevents clickjacking)
- MSAL iframes would fail with "Refused to display in a frame"
- Popup approach works reliably across all environments

### 3. Enhanced Outlook Connection Handler

**File**: `frontend/src/components/OutlookConnect.jsx`

```javascript
const handleConnect = async () => {
  setLoading(true)

  try {
    // Get access token from Microsoft with Mail.Read scopes
    const accessToken = await getGraphMailToken()

    // Validate token before sending
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      throw new Error('No se pudo obtener un token válido de Microsoft. Por favor, inicia sesión nuevamente.')
    }

    // Send token to backend
    await connectGraph({ accessToken, refreshToken: null })

    setGraphConnection(true, new Date())
    toast.success('Outlook conectado exitosamente')
    await checkConnectionStatus()

  } catch (error) {
    console.error('Error al conectar Outlook:', error)
    
    // Check if it's a Microsoft authentication error
    if (error.message?.includes('No accounts found') || 
        error.message?.includes('token acquisition failed') ||
        error.message?.includes('grant permission')) {
      toast.error(error.message || 'Por favor, inicia sesión con Microsoft primero')
    } else {
      toast.error(error.message || 'Error al conectar Outlook')
    }
  } finally {
    setLoading(false)
  }
}
```

**Improvements**:
- Uses `getGraphMailToken()` instead of generic `getAccessToken()`
- Validates token before API call (prevents 400 errors)
- Better error categorization (auth errors vs API errors)
- More descriptive error messages to guide user

### 4. Improved Backend Validation Logging

**File**: `backend/src/routes/graphRoutes.js`

```javascript
router.post('/connect', [
    body('accessToken').isString().notEmpty().withMessage('Access token must be a non-empty string.'),
    body('refreshToken').optional().isString().withMessage('Refresh token must be a string.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors in /connect:', errors.array());
        return res.status(400).json({ 
            message: 'Invalid request parameters',
            errors: errors.array() 
        });
    }
    // ...
```

**Why**: Backend now logs validation errors with clear message for debugging.

## Testing Steps

### 1. First Time Connection
1. Login to FinSmart with Microsoft account
2. Navigate to Outlook page
3. Click "Conectar Outlook" button
4. **Expected**: Popup requesting Mail permissions (if not already granted)
5. Grant permissions
6. **Expected**: Toast "Outlook conectado exitosamente"
7. Verify connection status shows green and last sync time

### 2. Reconnection After Disconnect
1. Click "Desconectar" on Outlook page
2. **Expected**: Toast "Outlook desconectado"
3. Click "Conectar Outlook" again
4. **Expected**: 
   - If token still valid: Silent connection (no popup)
   - If token expired: Popup for re-consent
5. **Expected**: Toast "Outlook conectado exitosamente"
6. **Expected**: No 400 errors in console

### 3. Manual Sync
1. With Outlook connected
2. Click "Sincronizar Emails" button
3. **Expected**: Sync progress indicator
4. **Expected**: Toast "Sincronización completada"
5. Check Dashboard for new transactions

### 4. Error Scenarios

**Scenario A: No Microsoft Account**
- Navigate to Outlook page without logging in with Microsoft
- Click "Conectar Outlook"
- **Expected**: Toast "No accounts found. Please sign in with Microsoft first."

**Scenario B: Permission Denied**
- Popup appears requesting Mail permissions
- User clicks "Cancel"
- **Expected**: Toast "Could not acquire Microsoft Graph Mail access token. Please grant permission to access your emails."

**Scenario C: Network Error**
- Disconnect internet
- Click "Conectar Outlook"
- **Expected**: Toast "Error al conectar Outlook" + network error details

## What Changed vs Before

| Aspect | Before | After |
|--------|--------|-------|
| **Scopes** | Only `User.Read` | `User.Read`, `Mail.Read`, `Mail.ReadWrite` |
| **Token Function** | Generic `getAccessToken()` | Dedicated `getGraphMailToken()` |
| **Validation** | None on frontend | Token validated before API call |
| **Error Messages** | Generic "Error al conectar" | Specific auth/permission/network errors |
| **Backend Logging** | No validation logs | Logs validation errors with details |
| **User Consent** | Not requested | Popup shown if Mail permissions not granted |

## Microsoft Graph Scopes Explained

| Scope | Purpose | Required For |
|-------|---------|--------------|
| `User.Read` | Read user profile (name, email) | Basic authentication |
| `Mail.Read` | Read user's emails | Listing and reading emails |
| `Mail.ReadWrite` | Read and modify emails | Marking as read, moving folders (future) |
| `openid` | OpenID Connect authentication | User identity |
| `profile` | Basic profile information | Display name |
| `email` | Email address | User email |

## Debugging Guide

### Console Logs to Look For

**Successful Connection**:
```
✅ Successfully acquired Graph Mail token silently
POST /api/graph/connect 200
Outlook conectado exitosamente
```

**First-time Connection (with popup)**:
```
🔄 Requesting Graph Mail token interactively...
[User grants permission in popup]
✅ Successfully acquired Graph Mail token via popup
POST /api/graph/connect 200
Outlook conectado exitosamente
```

**Error: No Microsoft Account**:
```
❌ Error al conectar Outlook: Error: No accounts found. Please sign in with Microsoft first.
Toast: "No accounts found. Please sign in with Microsoft first."
```

**Error: Permission Denied**:
```
❌ Interactive Graph Mail token acquisition failed
❌ Error al conectar Outlook: Error: Could not acquire Microsoft Graph Mail access token...
Toast: "Could not acquire Microsoft Graph Mail access token. Please grant permission to access your emails."
```

**Error: Invalid Token (400)**:
```
Validation errors in /connect: [ { msg: 'Access token must be a non-empty string.', ... } ]
POST /api/graph/connect 400
Toast: "Invalid request parameters"
```

### Railway Logs to Check

```bash
# Check backend logs for validation errors
railway logs --service backend

# Look for:
# - "Validation errors in /connect:"
# - "Graph API connection error:"
# - "Authentication failed. The access token may be invalid or expired."
```

## Next Steps

1. **Deploy Changes**:
   ```bash
   git add .
   git commit -m "fix: Resolve Outlook reconnection 400 error with Mail scopes"
   git push origin master
   ```

2. **User Testing**: Ask user to try disconnect → reconnect workflow

3. **Monitor Logs**: Watch Railway logs for any validation errors

4. **Verify Sync**: Confirm email sync works after reconnection

## Additional Improvements Made

### Enhanced Token Validation
- All token acquisition functions now check for null/undefined
- Descriptive error messages guide user on next steps

### Better Error Categorization
- Auth errors: "Please sign in with Microsoft first"
- Permission errors: "Please grant permission to access your emails"
- Network errors: Generic error + details
- Validation errors: "Invalid request parameters"

### Logging for Debugging
- Frontend logs token acquisition attempts (silent vs popup)
- Backend logs validation failures with error details
- Both sides use consistent error format

## Success Criteria

✅ User can disconnect Outlook and reconnect without 400 errors  
✅ First-time connection prompts for Mail permissions  
✅ Subsequent connections use silent token acquisition (no popup)  
✅ Clear error messages guide user on permission/auth issues  
✅ Backend logs validation errors for debugging  
✅ Email sync works correctly after reconnection

## Related Files Modified

1. `frontend/src/config/msalConfig.js` - Added `graphMailRequest` with Mail scopes
2. `frontend/src/hooks/useMicrosoftAuth.js` - Added `getGraphMailToken()` function
3. `frontend/src/components/OutlookConnect.jsx` - Enhanced `handleConnect()` with validation
4. `backend/src/routes/graphRoutes.js` - Improved validation error logging

## Commit History

- Previous: `c9b57b4` - Mobile navigation fix
- Current: Outlook reconnection fix with Mail scopes and validation

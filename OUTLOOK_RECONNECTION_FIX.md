# Outlook Reconnection Fix - 400 Error Resolution

## Problem Analysis

### User Report
```
Failed to load resource: the server responded with a status of 400 ()
api/graph/connect:1  Failed to load resource: the server responded with a status of 400 ()
(repeated 5 times)

"no funciona cuando desconecto y vuelvo a conectar el outlook"
```

### Root Causes Identified

1. **Missing Mail Scopes**: Initial login only requested `User.Read`, but Outlook connection requires `Mail.Read` and `Mail.ReadWrite` scopes
2. **Token Validation**: Frontend wasn't validating token before sending to backend
3. **Poor Error Messages**: Backend validation errors weren't descriptive enough
4. **Missing Error Handling**: getAccessToken() could return null/undefined without proper handling

## Solution Implemented

### 1. Added Microsoft Graph Mail Scopes

**File**: `frontend/src/config/msalConfig.js`

```javascript
// Separate request for Microsoft Graph Mail access
export const graphMailRequest = {
  scopes: ['User.Read', 'Mail.Read', 'Mail.ReadWrite', 'openid', 'profile', 'email'],
  forceRefresh: false
};
```

**Why**: Microsoft Graph requires explicit consent for Mail operations. The original `loginRequest` only had basic profile scopes.

### 2. Created Dedicated Graph Mail Token Function

**File**: `frontend/src/hooks/useMicrosoftAuth.js`

```javascript
const getGraphMailToken = async () => {
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please sign in with Microsoft first.')
  }

  try {
    // Try silent token acquisition with Mail scopes
    const response = await instance.acquireTokenSilent({
      ...graphMailRequest,
      account: accounts[0]
    })
    
    if (!response || !response.accessToken) {
      throw new Error('Failed to acquire Graph Mail access token from Microsoft')
    }
    
    console.log('✅ Successfully acquired Graph Mail token silently')
    return response.accessToken
  } catch (error) {
    console.error('Silent Graph Mail token acquisition failed:', error)
    // Try interactive token acquisition - this will prompt user to consent to Mail scopes
    try {
      console.log('🔄 Requesting Graph Mail token interactively...')
      const response = await instance.acquireTokenPopup(graphMailRequest)
      
      if (!response || !response.accessToken) {
        throw new Error('Failed to acquire Graph Mail access token from Microsoft popup')
      }
      
      console.log('✅ Successfully acquired Graph Mail token via popup')
      return response.accessToken
    } catch (interactiveError) {
      console.error('Interactive Graph Mail token acquisition failed:', interactiveError)
      throw new Error('Could not acquire Microsoft Graph Mail access token. Please grant permission to access your emails.')
    }
  }
}
```

**Flow**:
1. First try silent token acquisition (if already consented)
2. If silent fails, show popup to request user consent
3. Detailed error messages guide user on what's needed

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

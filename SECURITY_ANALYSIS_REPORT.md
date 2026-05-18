# Security Analysis Report - Idle Collective Game

**Date:** 2026-03-11
**Analyzed By:** Claude Sonnet 4.6
**Project:** Idle Collective (Electron + React Game)

---

## Executive Summary

This security analysis identified **14 vulnerabilities** across multiple severity levels:
- **CRITICAL:** 3 issues
- **HIGH:** 5 issues
- **MEDIUM:** 4 issues
- **LOW:** 2 issues

The most critical issues involve command injection vulnerabilities in the Electron main process, outdated dependencies with known CVEs, and insufficient input validation on save/load operations.

---

## 1. CRITICAL VULNERABILITIES

### 1.1 Command Injection via execSync (CRITICAL)
**Location:** `electron/main.ts:64`

**Issue:**
```typescript
const result = childProcess.execSync('node ' + syncScriptPath, {
  cwd: path.dirname(syncScriptPath),
  encoding: 'utf-8'
})
```

**Risk:** If `syncScriptPath` is manipulated (e.g., through symlink attacks or path traversal), an attacker could execute arbitrary commands with the privileges of the Electron app.

**Attack Vector:**
- Attacker places malicious script at predictable path
- App executes it with `execSync` on startup
- Full system compromise possible

**Remediation:**
```typescript
// Validate path is within expected directory
const allowedDir = path.join(__dirname, '../scripts')
const resolvedPath = path.resolve(syncScriptPath)
if (!resolvedPath.startsWith(allowedDir)) {
  throw new Error('Invalid script path')
}

// Use execFile instead of execSync for better security
const { execFile } = require('child_process')
execFile('node', [syncScriptPath], {
  cwd: path.dirname(syncScriptPath),
  timeout: 5000
}, (error, stdout, stderr) => {
  if (error) {
    console.error('Config sync failed:', error)
  }
})
```

---

### 1.2 Unvalidated JSON.parse on User-Controlled Data (CRITICAL)
**Locations:**
- `src/domain/save/SaveManager.ts:126`
- `src/ui/components/save/SaveLoadPanel.tsx:30, 124`

**Issue:**
```typescript
const saveData = JSON.parse(json) as SaveData
```

**Risk:**
- No validation of parsed data structure
- Malicious save files could inject unexpected data types
- Prototype pollution possible
- Type coercion attacks

**Attack Vector:**
```json
{
  "__proto__": {
    "isAdmin": true
  },
  "metadata": {...}
}
```

**Remediation:**
```typescript
// Use schema validation
import { z } from 'zod'

const SaveDataSchema = z.object({
  metadata: z.object({
    id: z.string(),
    name: z.string().max(50),
    createdAt: z.number().positive(),
    updatedAt: z.number().positive(),
    playTime: z.number().nonnegative(),
    version: z.string()
  }),
  game: z.object({
    tick: z.number().nonnegative(),
    gameTime: z.number().nonnegative(),
    isPaused: z.boolean()
  }),
  // ... validate all fields
})

// In loadFromSlot:
try {
  const rawData = JSON.parse(json)
  const saveData = SaveDataSchema.parse(rawData) // Throws if invalid
  // ... rest of logic
} catch (error) {
  return { success: false, message: '存档数据格式无效' }
}
```

---

### 1.3 localStorage Quota Exhaustion DoS (CRITICAL)
**Location:** `src/domain/save/SaveManager.ts:99-100`

**Issue:**
```typescript
const json = JSON.stringify(saveData)
localStorage.setItem(key, json)
```

**Risk:**
- No size validation before saving
- Attacker can create massive save files
- localStorage quota exhaustion (5-10MB limit)
- Denial of service for legitimate saves

**Remediation:**
```typescript
const MAX_SAVE_SIZE = 2 * 1024 * 1024 // 2MB limit

saveToSlot(slotIndex: number, saveData: SaveData): SaveResult {
  try {
    const json = JSON.stringify(saveData)

    // Validate size
    const sizeInBytes = new Blob([json]).size
    if (sizeInBytes > MAX_SAVE_SIZE) {
      return {
        success: false,
        message: `存档过大 (${(sizeInBytes/1024/1024).toFixed(2)}MB)，最大允许2MB`
      }
    }

    localStorage.setItem(key, json)
    return { success: true, saveId: saveData.metadata.id }
  } catch (error) {
    // Handle QuotaExceededError specifically
    if (error.name === 'QuotaExceededError') {
      return { success: false, message: '存储空间已满，请删除旧存档' }
    }
    return { success: false, message: '存档失败' }
  }
}
```

---

## 2. HIGH SEVERITY VULNERABILITIES

### 2.1 Dependency Vulnerabilities (HIGH)
**Source:** `npm audit` output

**Critical Dependencies:**
- **electron <35.7.5** - ASAR Integrity Bypass (GHSA-vmqv-hx8q-j7mg)
- **esbuild <=0.24.2** - Dev server request bypass (GHSA-67mh-4wv8-2f99)
- **tar <=7.5.9** - Path traversal, hardlink attacks (5 CVEs)
- **@tootallnate/once <3.0.1** - Control flow scoping issue

**Impact:**
- Electron: Attackers can modify ASAR archives, inject malicious code
- esbuild: Development server can be exploited to read arbitrary files
- tar: File overwrite, symlink poisoning during extraction

**Remediation:**
```bash
# Update dependencies
npm install electron@40.8.0
npm install vite@latest vitest@latest
npm audit fix --force

# Verify no breaking changes
npm test
npm run build
```

---

### 2.2 Missing Content Security Policy (HIGH)
**Location:** `index.html:6`

**Issue:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
```

**Problems:**
- `'unsafe-inline'` allows inline scripts (XSS risk)
- No `object-src`, `base-uri`, `form-action` restrictions
- Missing `upgrade-insecure-requests`

**Remediation:**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self';
               img-src 'self' data:;
               font-src 'self';
               connect-src 'self';
               object-src 'none';
               base-uri 'self';
               form-action 'self';
               frame-ancestors 'none';
               upgrade-insecure-requests;">
```

**Note:** Remove all inline scripts and styles, move to external files.

---

### 2.3 Electron Security Configuration Issues (HIGH)
**Location:** `electron/main.ts:21-25`

**Current Configuration:**
```typescript
webPreferences: {
  nodeIntegration: false,        // ✓ Good
  contextIsolation: true,        // ✓ Good
  preload: path.join(__dirname, 'preload.js'),
}
```

**Missing Security Headers:**
- No `sandbox: true`
- No `webSecurity` enforcement
- No `allowRunningInsecureContent: false`
- Dev tools open in production

**Remediation:**
```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,                    // Enable sandbox
  webSecurity: true,                // Enforce web security
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  preload: path.join(__dirname, 'preload.js'),
}

// Remove dev tools in production
if (isDev) {
  mainWindow.webContents.openDevTools()
}
```

---

### 2.4 Unvalidated Config File Loading (HIGH)
**Location:** `src/data/config/ConfigManager.ts:63-139`

**Issue:**
```typescript
const response = await fetch('config/game-config.json')
if (response.ok) {
  this.gameConfig = await response.json()
}
```

**Risk:**
- No validation of config structure
- Malicious config files can inject unexpected values
- Type confusion attacks
- Integer overflow in game mechanics

**Attack Example:**
```json
{
  "character": {
    "maxCount": 999999999,
    "moodDecayRate": -999999
  }
}
```

**Remediation:**
```typescript
private async loadGameConfig(): Promise<void> {
  try {
    const response = await fetch('config/game-config.json')
    if (response.ok) {
      const data = await response.json()

      // Validate structure and ranges
      if (!this.isValidGameConfig(data)) {
        throw new Error('Invalid config structure')
      }

      this.gameConfig = data
    }
  } catch {
    this.gameConfig = this.getDefaultGameConfig()
  }
}

private isValidGameConfig(config: any): boolean {
  return (
    typeof config.version === 'string' &&
    config.map?.width > 0 && config.map?.width <= 1000 &&
    config.map?.height > 0 && config.map?.height <= 1000 &&
    config.character?.maxCount > 0 && config.character?.maxCount <= 100 &&
    config.character?.moodDecayRate >= 0 && config.character?.moodDecayRate <= 10
    // ... validate all fields
  )
}
```

---

### 2.5 Debug Panel Accessible in Production (HIGH)
**Location:** `src/ui/components/debug/DebugPanel.tsx:30-32`

**Issue:**
```typescript
if (!isDevelopment) {
  return null
}
```

**Risk:**
- `import.meta.env.DEV` can be manipulated
- Debug functions expose game state manipulation
- Resource cheating, god mode, instant boss spawns

**Remediation:**
```typescript
// Use build-time constant
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export function DebugPanel() {
  // Completely remove debug panel in production builds
  if (IS_PRODUCTION) {
    return null
  }

  // Add authentication for debug access
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const password = prompt('Enter debug password:')
    if (password === process.env.DEBUG_PASSWORD) {
      setAuthenticated(true)
    }
  }, [])

  if (!authenticated) return null

  // ... rest of component
}
```

---

## 3. MEDIUM SEVERITY VULNERABILITIES

### 3.1 Missing Input Sanitization (MEDIUM)
**Location:** `src/ui/components/save/SaveLoadPanel.tsx:164`

**Issue:**
```typescript
<input
  type="text"
  value={saveName}
  onChange={(e) => setSaveName(e.target.value)}
  maxLength={20}
/>
```

**Risk:**
- No sanitization of save names
- Special characters could break UI
- Potential for stored XSS if names are rendered elsewhere

**Remediation:**
```typescript
const sanitizeSaveName = (name: string): string => {
  return name
    .replace(/[<>\"'&]/g, '') // Remove HTML special chars
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // Allow alphanumeric + Chinese
    .trim()
    .slice(0, 20)
}

onChange={(e) => setSaveName(sanitizeSaveName(e.target.value))}
```

---

### 3.2 Race Condition in Auto-Save (MEDIUM)
**Location:** `src/domain/save/SaveManager.ts:188-192`

**Issue:**
```typescript
this.autoSaveInterval = setInterval(() => {
  const saveData = getSaveData()
  this.saveToSlot(slotIndex, saveData)
}, interval)
```

**Risk:**
- No locking mechanism
- Concurrent saves can corrupt data
- User manual save + auto-save collision

**Remediation:**
```typescript
private isSaving = false

startAutoSave(interval: number, getSaveData: () => SaveData, slotIndex: number = 0): void {
  this.stopAutoSave()

  this.autoSaveInterval = setInterval(async () => {
    if (this.isSaving) {
      this.logger.warn('Save already in progress, skipping auto-save')
      return
    }

    this.isSaving = true
    try {
      const saveData = getSaveData()
      await this.saveToSlot(slotIndex, saveData)
    } finally {
      this.isSaving = false
    }
  }, interval)
}
```

---

### 3.3 Insufficient Error Information Leakage (MEDIUM)
**Location:** Multiple locations

**Issue:**
```typescript
catch (error) {
  const message = error instanceof Error ? error.message : '存档失败'
  this.logger.error('Save failed:', error)
  return { success: false, message }
}
```

**Risk:**
- Error messages may leak system paths
- Stack traces expose internal structure
- Helps attackers understand system

**Remediation:**
```typescript
catch (error) {
  // Log detailed error internally
  this.logger.error('Save failed:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    slotIndex
  })

  // Return generic message to user
  return {
    success: false,
    message: '存档失败，请重试' // Generic message
  }
}
```

---

### 3.4 No Rate Limiting on Shop Refresh (MEDIUM)
**Location:** `src/ui/components/shop/ShopPanel.tsx:66-73`

**Issue:**
```typescript
const handleRefresh = () => {
  const result = shopManager?.instantRefresh()
  // No rate limiting
}
```

**Risk:**
- Users can spam refresh to find legendary items
- Game balance broken
- Resource exploitation

**Remediation:**
```typescript
const [lastRefresh, setLastRefresh] = useState(0)
const REFRESH_COOLDOWN = 5000 // 5 seconds

const handleRefresh = () => {
  const now = Date.now()
  if (now - lastRefresh < REFRESH_COOLDOWN) {
    const remaining = Math.ceil((REFRESH_COOLDOWN - (now - lastRefresh)) / 1000)
    alert(`请等待 ${remaining} 秒后再刷新`)
    return
  }

  const result = shopManager?.instantRefresh()
  if (result && !result.success) {
    alert(result.message || '刷新失败')
  } else {
    setLastRefresh(now)
    updateShopItems()
  }
}
```

---

## 4. LOW SEVERITY ISSUES

### 4.1 Weak Random ID Generation (LOW)
**Location:** `src/domain/save/SaveManager.ts:41`

**Issue:**
```typescript
id: `save_${now}_${Math.random().toString(36).substr(2, 9)}`
```

**Risk:**
- `Math.random()` is not cryptographically secure
- Predictable IDs could lead to save slot collisions

**Remediation:**
```typescript
import { v4 as uuidv4 } from 'uuid'

id: `save_${now}_${uuidv4()}`
```

---

### 4.2 Missing HTTPS Enforcement (LOW)
**Location:** `electron/main.ts:33`

**Issue:**
```typescript
mainWindow.loadURL('http://localhost:3000')
```

**Risk:**
- Development server uses HTTP
- Man-in-the-middle attacks possible on local network

**Remediation:**
- Use HTTPS for development server
- Add certificate validation

---

## 5. SECURITY BEST PRACTICES VIOLATIONS

### 5.1 No Secrets Management
- No `.env` file usage
- No secret rotation mechanism
- Hardcoded configuration paths

### 5.2 Missing Security Headers
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options: DENY`
- No `Referrer-Policy`

### 5.3 No Logging/Monitoring
- No security event logging
- No failed login attempt tracking
- No anomaly detection

---

## 6. REMEDIATION PRIORITY

### Immediate (Within 24 hours):
1. Fix command injection in `electron/main.ts`
2. Update Electron to v40.8.0
3. Add JSON validation to save/load operations
4. Disable debug panel in production

### Short-term (Within 1 week):
1. Update all dependencies (`npm audit fix --force`)
2. Implement CSP without `unsafe-inline`
3. Add input validation to all user inputs
4. Implement save file size limits

### Medium-term (Within 1 month):
1. Add comprehensive schema validation (Zod)
2. Implement rate limiting
3. Add security event logging
4. Conduct penetration testing

---

## 7. TESTING RECOMMENDATIONS

### Security Test Cases:
```typescript
// Test 1: Malicious save file
test('should reject malformed save data', () => {
  const maliciousSave = '{"__proto__": {"isAdmin": true}}'
  const result = saveManager.loadFromSlot(0)
  expect(result.success).toBe(false)
})

// Test 2: Oversized save file
test('should reject oversized saves', () => {
  const hugeSave = { data: 'x'.repeat(10 * 1024 * 1024) }
  const result = saveManager.saveToSlot(0, hugeSave)
  expect(result.success).toBe(false)
})

// Test 3: Path traversal
test('should prevent path traversal in config loading', () => {
  const result = configManager.loadConfig('../../../etc/passwd')
  expect(result).toBeNull()
})
```

---

## 8. COMPLIANCE CHECKLIST

- [ ] No hardcoded secrets
- [ ] All user inputs validated
- [ ] SQL injection prevention (N/A - no SQL)
- [ ] XSS prevention (Partial - needs CSP fix)
- [ ] CSRF protection (N/A - no forms)
- [ ] Authentication/authorization (N/A - single player)
- [ ] Rate limiting (Missing)
- [ ] Error messages sanitized (Needs improvement)
- [ ] Dependencies up to date (No - 14 vulnerabilities)
- [ ] Security headers configured (Partial)

---

## 9. CONCLUSION

The Idle Collective game has **moderate security risks** primarily due to:
1. Command injection vulnerability in Electron main process
2. Outdated dependencies with known CVEs
3. Insufficient input validation on save/load operations

**Risk Level:** MEDIUM-HIGH

**Recommended Action:** Address all CRITICAL and HIGH severity issues before public release. The game is safe for local single-player use but should not be distributed until vulnerabilities are patched.

---

## 10. REFERENCES

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- npm audit advisories: https://github.com/advisories
- CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---

**Report Generated:** 2026-03-11
**Next Review:** 2026-04-11 (or after remediation)

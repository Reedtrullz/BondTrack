# T2.5 Security Headers Evidence

## Code changes
- Shared `src/lib/api/cors.ts` now appends:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block`
- Proxy routes now consume the shared CORS helper.

## Verification
- `npm run lint` ✅
- `npm test` ✅ (169/169)
- `npm run build` ✅

## curl samples
### /api/health
HTTP/1.1 200 OK
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/midgard/invalid
HTTP/1.1 403 Forbidden
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/thorchain/invalid
HTTP/1.1 403 Forbidden
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/coingecko/invalid
HTTP/1.1 403 Forbidden
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/coinapi/rune-price
HTTP/1.1 503 Service Unavailable
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/address/invalid
HTTP/1.1 400 Bad Request
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

### /api/tax-report
HTTP/1.1 400 Bad Request
referrer-policy: strict-origin-when-cross-origin
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block

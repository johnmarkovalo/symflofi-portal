# SymfloFi Cloud API Reference

Base URL for Edge Functions: `https://<supabase-project>.supabase.co/functions/v1`
Base URL for Next.js API routes: `https://cloud.symflo.dev/api`

---

## Edge Functions (Device Firmware)

These endpoints are called by SymfloFi devices running ImmortalWrt firmware.

### POST `/functions/v1/validate-license`

Validates a license key and binds it to a machine. Called on device boot.

**Request:**

```json
{
  "license_key": "SYMF-XXXX-XXXX-XXXX",
  "machine_uuid": "device-unique-id",
  "app_version": "1.2.0",
  "hardware": "mt7621",
  "os_version": "ImmortalWrt 23.05.4"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `license_key` | string | Yes | License key assigned to the device |
| `machine_uuid` | string | Yes | Unique device identifier |
| `app_version` | string | No | SymfloFi firmware version |
| `hardware` | string | No | Hardware/board model |
| `os_version` | string | No | ImmortalWrt version string |

**Response (success):**

```json
{
  "valid": true,
  "tier": "pro",
  "expiresAt": "2027-03-11T00:00:00Z",
  "machineId": "uuid-of-machine-row",
  "activated": true,
  "limits": {
    "maxConcurrentUsers": 50,
    "maxVouchersPerMonth": 500,
    "maxSubVendos": 3,
    "epaymentEnabled": true,
    "cloudDashboard": true,
    "sessionRoaming": false,
    "remoteAccess": true,
    "salesHistoryDays": 90,
    "otaChannel": "stable"
  }
}
```

**Response (error):**

```json
{
  "valid": false,
  "error": "License key not found"
}
```

| Status | Error | Cause |
|--------|-------|-------|
| 200 | `License key not found` | Invalid key |
| 200 | `License key has expired` | Key past `activated_at + duration_days` |
| 200 | `License key is already bound to another machine` | Key activated on a different `machine_uuid` |
| 200 | `License key has no operator assigned` | Orphaned key with no `operator_id` |
| 400 | `Missing license_key or machine_uuid` | Required fields missing |
| 500 | `Failed to activate license: ...` | Database/RPC error |

**Notes:**
- First call with a new `machine_uuid` creates the machine record and sets `activated_at`
- Subsequent calls from the same machine update `last_seen_at` and device info
- Expiry is computed as `activated_at + duration_days`, not from a fixed date
- The `limits` object controls device-side feature gating

---

### POST `/functions/v1/heartbeat`

Periodic health check from devices. Updates online status, device info, and stores health metrics.

**Request:**

```json
{
  "machine_uuid": "device-unique-id",
  "license_key": "SYMF-XXXX-XXXX-XXXX",
  "wg_public_key": "base64-wireguard-public-key",
  "ip_address": "192.168.1.100",
  "app_version": "1.2.0",
  "hardware": "mt7621",
  "os_version": "ImmortalWrt 23.05.4",
  "health": {
    "mem_used_percent": 45.2,
    "disk_used_percent": 12.8,
    "cpu_temp": 58,
    "uptime_secs": 86400,
    "connected_clients": 12
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `machine_uuid` | string | Yes | Unique device identifier |
| `license_key` | string | Yes | License key bound to this device |
| `wg_public_key` | string | No | WireGuard public key for VPN provisioning |
| `ip_address` | string | No | Device's current IP address |
| `app_version` | string | No | Firmware version |
| `hardware` | string | No | Board/hardware model |
| `os_version` | string | No | OS version string |
| `health` | object | No | Health metrics snapshot |

**Health object fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mem_used_percent` | number | RAM usage percentage |
| `disk_used_percent` | number | Disk usage percentage |
| `cpu_temp` | number | CPU temperature in Celsius |
| `uptime_secs` | number | Device uptime in seconds |
| `connected_clients` | number | Currently connected WiFi clients |

**Response (success):**

```json
{
  "ok": true,
  "wg_ip": "10.0.0.5"
}
```

`wg_ip` is `null` if WireGuard is not provisioned or `wg_public_key` was not provided.

**Response (error):**

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"ok": false, "error": "machine_uuid and license_key are required"}` | Missing required fields |
| 404 | `{"ok": false, "error": "unknown machine"}` | No machine found with this key + UUID pair |
| 500 | `{"ok": false, "error": "internal error: ..."}` | Server error |

**Notes:**
- Should be called every 60 seconds by the device
- Updates `last_seen_at` and `is_online` on the machine record
- Health snapshots are stored in `machine_health` (last 100 kept per machine)
- If `wg_public_key` is new or changed, provisions a WireGuard peer on the VPS and returns the assigned `wg_ip`

---

## Next.js API Routes (Portal)

These endpoints are used by the SymfloFi Cloud web portal. All authenticated routes require a valid Supabase session cookie.

### POST `/api/payments/create-session`

Creates a payment checkout session for a license order.

**Auth:** Required (operator)
**Rate limit:** 5 requests/minute per user

**Request:**

```json
{
  "orderId": "uuid-of-order"
}
```

**Response (success):**

```json
{
  "checkoutUrl": "https://checkout.xendit.co/web/..."
}
```

**Response (error):**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Missing orderId` | No `orderId` in request body |
| 401 | `Unauthorized` | Not authenticated |
| 403 | `Operator not found` | User has no operator record |
| 404 | `Order not found` | Order doesn't exist or belongs to another operator |
| 500 | `Order is not pending` | Order already paid/cancelled/failed |

---

### GET `/api/payments/status?orderId=<uuid>`

Polls the payment status of an order. If the order is still pending and has a provider session, checks with the payment provider for updates.

**Auth:** Required (operator)
**Rate limit:** 20 requests/minute per user

**Response:**

```json
{
  "status": "pending" | "paid" | "failed" | "expired" | "cancelled"
}
```

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Missing orderId` | No `orderId` query parameter |
| 401 | `Unauthorized` | Not authenticated |
| 403 | `Operator not found` | No operator record |
| 404 | `Order not found` | Order doesn't exist or wrong operator |

---

### POST `/api/payments/webhook`

Receives payment status webhooks from the payment provider (Xendit).

**Auth:** None (verified via provider webhook token)
**Rate limit:** 100 requests/minute per IP

**Request:** Provider-specific webhook payload (Xendit invoice callback).

**Response:**

```json
{
  "received": true
}
```

On a `paid` event, the system automatically:
1. Updates the order status to `paid` with payment details
2. Generates license keys for each line item in the order

| Status | Error | Cause |
|--------|-------|-------|
| 401 | `Unauthorized` | Invalid webhook verification token |
| 500 | `Webhook processing failed` | Internal processing error |

---

### POST `/api/audit`

Logs an admin action to the audit trail.

**Auth:** Required (admin only)
**Rate limit:** 30 requests/minute per user

**Request:**

```json
{
  "action": "create" | "update" | "delete" | "approve" | "deny",
  "entityType": "operator" | "license" | "admin_user" | "tier" | ...,
  "entityId": "uuid-of-entity",
  "summary": "Created operator John Doe",
  "details": { "optional": "metadata" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | Action performed |
| `entityType` | string | Yes | Type of entity affected |
| `entityId` | string | No | ID of the affected entity |
| `summary` | string | Yes | Human-readable description |
| `details` | object | No | Additional metadata |

**Response:**

```json
{
  "ok": true
}
```

---

### POST `/api/track-download`

Tracks a firmware download event. No authentication required.

**Rate limit:** 30 requests/minute per IP

**Request:**

```json
{
  "version": "1.2.0",
  "board": "mt7621",
  "file_type": "sysupgrade"
}
```

**Response:**

```json
{
  "ok": true
}
```

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Missing fields` | `version`, `board`, or `file_type` not provided |

---

## Authentication

### Edge Functions

Edge Functions use the Supabase service role key internally — devices do not authenticate. Security relies on the device possessing a valid `license_key` + `machine_uuid` pair.

### Portal API Routes

Portal routes use Supabase Auth with session cookies. The session is established at sign-in and refreshed automatically by middleware on every request. API routes verify the session via `supabase.auth.getUser()`.

---

## Rate Limiting

All API routes are rate limited using sliding window counters backed by Upstash Redis.

| Endpoint | Limit | Identifier |
|----------|-------|------------|
| `POST /api/payments/create-session` | 5/min | User ID |
| `GET /api/payments/status` | 20/min | User ID |
| `POST /api/payments/webhook` | 100/min | IP address |
| `POST /api/audit` | 30/min | User ID |
| `POST /api/track-download` | 30/min | IP address |

When rate limited, the response is:

```json
{
  "error": "Too many requests"
}
```

With headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (HTTP 429).

---

## CORS

Edge Functions include permissive CORS headers (`Access-Control-Allow-Origin: *`) to allow cross-origin requests from devices. Portal API routes do not set CORS headers as they are same-origin.

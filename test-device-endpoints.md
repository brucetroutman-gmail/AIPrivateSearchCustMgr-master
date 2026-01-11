# Device-Based Licensing Test Commands

## Test Device Registration
```bash
curl -X POST http://localhost:56304/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D",
    "deviceName": "MacBook Pro Test"
  }'
```

## Test Device Validation
```bash
curl -X POST http://localhost:56304/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D"
  }'
```

## Ubuntu Production Testing
```bash
curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D",
    "deviceName": "MacBook Pro Test"
  }'

curl -X POST https://custmgr.aiprivatesearch.com/api/licensing/validate-device \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bruce.troutman@gmail.com",
    "deviceUuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D"
  }'
```

## Expected Results

### Registration Success:
```json
{
  "success": true,
  "customer": {
    "email": "bruce.troutman@gmail.com",
    "tier": 1,
    "license_status": "trial"
  },
  "device": {
    "uuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D",
    "name": "MacBook Pro Test",
    "status": "active"
  }
}
```

### Validation Success:
```json
{
  "valid": true,
  "customer": {
    "email": "bruce.troutman@gmail.com",
    "tier": 1,
    "license_status": "trial",
    "expires_at": "2026-02-28T19:34:55.000Z"
  },
  "device": {
    "uuid": "878DCB2C-B624-5CC2-872C-6C0E0953372D",
    "name": "MacBook Pro Test",
    "registered_at": "2025-12-31T10:45:00.000Z"
  }
}
```
# API Testing Guide

This guide is for manual Postman or HTTP client testing of the minimum working backend.

Base URL:

```text
http://localhost:3000
```

## Automated Smoke Test

For repeatable local verification, run:

```bash
npm test
```

On Windows PowerShell, use this if `npm.ps1` is blocked:

```powershell
npm.cmd test
```

The automated smoke test starts the server on port `3100` by default and checks login, role access, citizen APIs, staff transaction detail, admin summary, upload metadata, and document permissions.

Before running it, import `schema.sql` and `seed.sql`, and configure the same database environment variables used by the backend.

If `npm test` fails during server readiness, check that `.env` exists and contains the real local MySQL credentials. Without `.env`, the test server falls back to empty/default database values and may not be able to connect.

## Login And JWT

Public login endpoint:

```http
POST /login
Content-Type: application/json
```

Body:

```json
{
  "national_id": "111222333",
  "password": "admin123"
}
```

Copy the returned `token` and send it on protected requests:

```http
Authorization: Bearer <token>
```

## Seed Test Accounts

| Role | National ID | Password |
| --- | --- | --- |
| Citizen | `123456789` | `password123` |
| Staff | `987654321` | `staff123` |
| Admin | `111222333` | `admin123` |

## Public Endpoints

```http
POST /register
POST /login
GET /api/vehicles
GET /api/test-results/:nationalId
POST /api/book-appointment
```

## Citizen Endpoints

Requires a citizen token.

```http
GET /api/citizen/me
GET /api/citizen/my-vehicles
GET /api/citizen/my-transactions
GET /api/citizen/my-transactions/:id
```

Citizen service request endpoints that create central transactions:

```http
POST /license/upload-license-renewal
POST /api/submit-lost-document
POST /api/ownership/form
POST /api/vehicle-registration
POST /api/renew-license
POST /api/vehicle-conversion
POST /api/vehicle-deregistration
POST /api/vehicle-modification
POST /api/vehicle-mortgage-release
```

Note: `/license/upload-license-renewal` is the intended spelling used by the current route. If a frontend still calls an older spelling, update the frontend to match the backend route.

## Upload Testing

Supported upload file types:

- `application/pdf` with `.pdf`
- `image/jpeg` with `.jpg` or `.jpeg`
- `image/png` with `.png`

Default maximum file size:

```text
5242880 bytes
```

In Postman, choose `form-data` and set each document field to `File`. Example for license renewal:

```http
POST /license/upload-license-renewal
Authorization: Bearer <citizen-token>
Content-Type: multipart/form-data
```

Required file fields:

```text
original_license
personal_id_card
personal_photo
medical_check
fines_clearance
```

Successful upload responses include a central `transaction` and a `documents` array from `transaction_documents`.

Private document APIs:

```http
GET /api/documents/transactions/:transactionId
GET /api/documents/:id/download
```

Access rules:

- Citizen can list/download documents only for their own transactions.
- Staff/admin can list/download documents for central transactions.
- `/uploads/...` is not publicly served.

## Staff Endpoints

Requires a staff or admin token.

```http
GET /api/staff/users
POST /api/staff/users/search
PUT /api/staff/users/confirm/:id
PUT /api/staff/users/reject/:id
POST /api/staff/smart-search
GET /api/staff/received-transactions
GET /api/staff/in-progress-transactions
GET /api/staff/completed-transactions
GET /api/staff/monthly-report
```

Staff central transaction workflow:

```http
GET /api/staff/transactions/:id
PUT /api/staff/transactions/:id/in-progress
PUT /api/staff/transactions/:id/complete
PUT /api/staff/transactions/:id/reject
PUT /api/staff/transactions/:id/transfer
```

Reject body:

```json
{
  "reason": "Missing required document"
}
```

Transfer body:

```json
{
  "target": "licensing-review",
  "note": "Needs review by licensing department"
}
```

## Admin Endpoints

Requires an admin token.

```http
GET /api/admin/users
GET /api/admin/users/:id
PUT /api/admin/users/:id/status
GET /api/admin/employees
POST /api/admin/employees
GET /api/admin/transactions
PUT /api/admin/transactions/:id/assign
GET /api/admin/dashboard/summary
```

Update user status:

```json
{
  "status": "confirmed"
}
```

Create employee:

```json
{
  "full_name": "New Staff Member",
  "national_id": "700000001",
  "email": "staff.member@example.com",
  "password": "TempPass123!",
  "employee_number": "EMP-7001",
  "department": "Licensing",
  "role": "staff",
  "phone": "0590000000"
}
```

Assign transaction:

```json
{
  "employee_id": 1
}
```

Dashboard summary response includes only:

```json
{
  "total_users": 10,
  "total_staff": 2,
  "total_transactions": 5,
  "transactions_by_status": {
    "received": 2,
    "in_progress": 1,
    "completed": 1,
    "rejected": 1
  }
}
```

## Access-Control Checks

Expected behavior:

- Missing token on protected routes returns `401`.
- Wrong role returns `403`.
- Citizen token cannot access staff/admin routes.
- Staff token cannot access admin routes.
- Admin token can access staff and admin routes.
- API responses must not include `password_hash`.

## Known Limitations

- Upload security is basic and still needs production storage, malware scanning, and retention rules.
- Uploaded documents are linked to `transaction_documents` for migrated upload routes.
- Some legacy service endpoints return compatibility response shapes.
- Traffic violations still use sample route data in one legacy route.
- There is no automated test runner yet; use this guide for smoke testing.

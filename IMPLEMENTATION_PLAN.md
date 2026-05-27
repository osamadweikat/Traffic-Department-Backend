# Traffic Department Backend Implementation Plan

## 1. Important Requirements Extracted From The Report

- Citizen mobile/web services: registration, login, profile, notifications, vehicle list, transaction tracking, complaints/suggestions, common questions, settings, saved cards, and service requests.
- Driver services: driving license renewal, payments, lost/replacement driving license documents, theoretical and practical test results.
- Vehicle services: vehicle license renewal, new vehicle registration, ownership transfer, lost/replacement vehicle documents, technical modifications, vehicle type conversion, mortgage release, vehicle deregistration, and violation lookup.
- Appointment service: citizens can choose city, branch, date, and time, then receive booking/QR data.
- Staff portal: staff login, notifications, account verification, complaint follow-up, inbox/messages, advanced search, activity log, monthly reports, received transactions, in-progress transactions, document review, AI document analysis, completed/rejected/transferred transactions, and password change.
- Admin portal: dashboard statistics, notifications, user management, employee management, transaction management and assignment, complaints/suggestions management, monthly portal report, content management, employee evaluations, system operation log, system settings, test result viewing, violation record viewing, and admin messaging.
- Cross-cutting requirements: secure authentication, protected personal data, structured workflow, file/document uploads, payment tracking, searchable records, status updates, reporting, and auditability.

## 2. Current Backend Problems

- The server does not start because `server.js` imports `routes/staff/monthlyReports`, but the existing file is `routes/staff/monthlyReport.js`.
- Several routes create a `connection` variable but call an undefined `db` variable at runtime.
- Several staff routes require `../../db`, but no shared `db.js` file exists.
- Database credentials, JWT secret, and external API keys are hardcoded in route files.
- There is no `.env.example` or safe environment configuration pattern.
- There is no database schema or migration folder, so expected tables and column names are not guaranteed.
- Table and field naming is inconsistent, for example `full_name` vs `fullName`, and `national_id` vs `nationalId`.
- Some routes use hardcoded/sample data instead of database data.
- Most APIs are unprotected even though they handle citizen, staff, vehicle, payment, and document data.
- Service routes save isolated records but do not consistently create or update a central transaction workflow.
- Upload handling is inconsistent and does not yet enforce file type, file size, or private document access.
- Report-level features such as notifications, complaint workflow, admin dashboards, logs, evaluations, settings, and content management are mostly missing.

## 3. Minimum Working Backend Scope

- The Express server starts successfully.
- The backend uses one shared database module.
- Environment variables are documented with `.env.example`.
- Existing route modules load without undefined `db` errors.
- Login/register and current service endpoints can be exercised against an existing compatible MySQL database.
- Existing upload routes keep their current behavior without introducing a larger redesign.
- No full report-level feature expansion is included in the minimum scope.

## 4. Implementation Checkpoints

1. Phase 1 foundation:
   - Fix the monthly report import.
   - Add shared `db.js`.
   - Add dotenv configuration and `.env.example`.
   - Replace undefined `db` usage with the shared database module.
   - Confirm the server loads.

2. Database baseline:
   - Design schema v1.
   - Add seed data for citizen, staff, admin, vehicles, violations, transactions, and reports.
   - Align backend column names with schema.
   - Phase 2 decision: schema v1 is intentionally a practical compatibility schema, not the full report schema.
   - Phase 2 decision: database names use snake_case. Small route fixes were made where old code expected camelCase database columns.
   - Phase 2 decision: service-specific tables are kept for the current routes, while `transactions` and `transaction_documents` provide the minimum base for the future central workflow.
   - Phase 2 decision: staff transaction list tables (`received_transactions`, `in_progress_transactions`, `completed_transactions`) are compatibility tables for current routes. A later phase should consolidate them into the central `transactions` workflow.
   - Phase 2 assumption: `owner_id` in lost-document and ownership-transfer routes currently means the citizen national ID, not the internal `users.id`.
   - Phase 2 assumption: `employees` is the staff table for v1; staff/admin accounts are also represented in `users` for future auth work.

3. Authentication and roles:
   - Centralize JWT handling.
   - Add citizen, staff, and admin permissions.
   - Protect sensitive routes.

4. Central transactions:
   - Add a unified transaction model.
   - Connect each service request to a transaction.
   - Add status movement and assignment.

5. Citizen APIs:
   - Complete profile, vehicles, transactions, services, notifications, complaints, payments, appointments, test results, and violations.

6. Staff APIs:
   - Complete received/in-progress/completed/rejected/transferred flows, document validation, complaint follow-up, messaging, activity logs, search, and reports.

7. Admin APIs:
   - Complete dashboard, user/employee management, transaction assignment, complaints/suggestions management, content management, reports, settings, logs, and evaluations.

8. Hardening:
   - Validate uploads and inputs.
   - Restrict private files.
   - Remove secrets from source.
   - Add safer error handling and audit logging.

9. Testing:
   - Add route smoke tests.
   - Add integration tests around auth and transaction workflow.
   - Add upload and permission tests.

## 5. What Should Not Be Implemented Yet

- Do not build the full database schema in Phase 1.
- Do not redesign the transaction workflow yet.
- Do not implement missing citizen, staff, or admin report features yet.
- Do not add full notification, complaint, content management, settings, evaluation, or reporting modules yet.
- Do not integrate or redesign AI document analysis yet.
- Do not change frontend API contracts without confirming the frontend expectations.
- Do not introduce large security behavior changes that could block existing prototype flows until the core routes are stabilized.

## 6. Phase 2 Verification Results

### Tested Routes

- `POST /register`
- `POST /login`
- `GET /api/vehicles`
- `GET /api/test-results/123456789`
- `POST /api/book-appointment`
- `GET /api/staff/users`
- `POST /api/staff/users/search`
- `PUT /api/staff/users/confirm/:id`
- `PUT /api/staff/users/reject/:id`
- `GET /api/staff/smart-search`
- `GET /api/staff/received-transactions`
- `GET /api/staff/in-progress-transactions`
- `GET /api/staff/completed-transactions`
- `GET /api/staff/monthly-report`

### Passed Routes

- All tested routes passed after importing the updated `schema.sql` and `seed.sql`.
- Seeded login accounts passed:
  - Citizen: `123456789` / `password123`
  - Staff: `987654321` / `staff123`
  - Admin: `111222333` / `admin123`

### Failed Routes During First Verification Run

- `POST /login` failed for seed users before seed data updated the old prototype users.
- `GET /api/test-results/123456789` failed because `theoretical_results` and `practical_results` were missing.
- `POST /api/book-appointment` failed because `appointments` was missing.
- Staff transaction/report routes failed because their compatibility tables were missing.
- User confirm/reject failed because the old `users` table did not have `is_confirmed`.
- Smart search failed because old `vehicles`, `transactions`, and `violations` tables were missing v1 compatibility columns.

### Fixes Made During Verification

- Updated `schema.sql` to be safer on an existing prototype database by adding missing v1 columns when old tables already exist.
- Updated `seed.sql` to seed by stable natural keys instead of assuming an empty database or fixed auto-increment IDs.
- Added compatibility seed handling for the old `vehicles` table, which still requires `user_id`.
- Added compatibility columns for the old `messages` table so current message routes can coexist with the previous schema.
- Confirmed `schema.sql` and `seed.sql` import successfully into the local `software` database.

### Remaining Blockers

- The local database still contains older prototype columns and rows, so responses may include both old and new column names until a later cleanup/migration phase.
- `trafficViolations.js` still uses hardcoded sample data instead of the `violations` table.
- Auth roles are not enforced yet; staff/admin routes are still publicly callable.
- Service routes still write to service-specific compatibility tables instead of consistently creating central `transactions`.
- Upload routes still need file validation, folder hardening, and protected document access.
- No automated test suite exists yet; verification was done with live HTTP calls.

### Recommended Next Phase

- Phase 3 should focus on authentication and roles:
  - central JWT middleware,
  - citizen/staff/admin role checks,
  - protected staff/admin APIs,
  - login response improvements,
  - and compatibility with the v1 `users.role` and `users.is_confirmed` columns.

## 7. Phase 3 Authentication And Roles Results

### Auth Decisions

- `JWT_SECRET` is now required from environment variables. The code no longer falls back to a hardcoded development JWT secret.
- `POST /login` stays public and returns:
  - `token`
  - `user.id`
  - `user.full_name`
  - `user.national_id`
  - `user.email`
  - `user.role`
- `POST /register` stays public and creates `citizen` users by default.
- Password hashing and comparison now use `bcryptjs` consistently in login and register.
- Staff routes are protected with staff/admin access.
- Citizen payment and license-renewal upload routes are protected with citizen access.

### Middleware Added

- `requireAuth`: verifies a Bearer JWT, loads the user from `users`, and attaches `req.user` plus `req.userId`.
- `requireRole`: checks whether `req.user.role` is in an allowed role list.
- `requireCitizen`: allows only `citizen`.
- `requireStaff`: allows `staff` and `admin`.
- `requireAdmin`: allows only `admin`.

### Protected Routes

- Staff-only/staff-admin routes:
  - `/api/staff/messages`
  - `/api/staff/completed-transactions`
  - `/api/staff/in-progress-transactions`
  - `/api/staff/received-transactions`
  - `/api/staff/smart-search`
  - `/api/staff/monthly-report`
  - `/api/staff/users`
- Citizen routes:
  - `/license/upload-license-renewal`
  - `/api/payment/license`

### Routes Left Public For Now

- `POST /login`
- `POST /register`
- `GET /api/vehicles`
- `GET /api/test-results/:nationalId`
- `POST /api/book-appointment`
- Existing vehicle/lost-document/ownership-transfer service request routes remain public for now because the current frontend/API ownership expectations are not fully clear.

### Smoke Tests

- Passed: citizen login with `123456789` / `password123`.
- Passed: staff login with `987654321` / `staff123`.
- Passed: admin login with `111222333` / `admin123`.
- Passed: public register creates a citizen user.
- Passed: staff route without token returns `401`.
- Passed: staff route with citizen token returns `403`.
- Passed: staff route with staff token returns `200`.
- Passed: staff route with admin token returns `200`.
- Passed with staff token:
  - `GET /api/staff/users`
  - `POST /api/staff/users/search`
  - `POST /api/staff/smart-search`
  - `GET /api/staff/received-transactions`
  - `GET /api/staff/in-progress-transactions`
  - `GET /api/staff/completed-transactions`
  - `GET /api/staff/monthly-report`
- Passed: public `GET /api/vehicles`.
- Passed: public `GET /api/test-results/123456789`.
- Passed: public `POST /api/book-appointment`.
- Passed: `/api/payment/license` without token returns `401`.
- Passed: `/api/payment/license` with citizen token returns `201`.

### Fixes Made During Verification

- Updated `schema.sql` to modify existing `license_payments.duration` columns to `VARCHAR(50)`, matching schema v1 and allowing values such as `1 year`.

### Remaining Blockers

- Many old prototype rows still use invalid placeholder password hashes, so only properly hashed users can log in.
- Staff user listing previously returned `password_hash`; this was sanitized in Phase 5.
- Several citizen service routes are still public because ownership and frontend expectations need confirmation.
- There is no refresh-token/session revocation flow.
- No automated auth test suite exists yet.
- Role checks are route-level only; object-level permissions such as "citizen can only see their own records" are still future work.

### Recommended Next Phase

- Phase 4 should focus on the central transaction workflow:
  - create transactions from service requests,
  - connect uploaded documents to transactions,
  - move records through received/in-progress/completed/rejected statuses,
  - and gradually replace compatibility staff transaction tables with the central `transactions` model.

## 8. Phase 4 Central Transaction Workflow Results

### Transaction Workflow Decisions

- A new transaction service helper creates central `transactions` rows after existing service-specific inserts succeed.
- Existing service-specific tables are still kept for compatibility.
- New central transactions use:
  - `transaction_id`: generated public transaction number.
  - `user_id`: authenticated citizen user id.
  - `transaction_type` and `service_type`: service code such as `lost_document` or `vehicle_registration`.
  - `status`: starts as `received`.
  - `related_table` and `related_record_id`: link back to the old compatibility service table.
  - `submitted_at` and `updated_at`: central timing fields.
  - `notes` and `rejection_reason`: minimum text fields for workflow notes and rejection reasons.
- Staff transaction list routes now read from the central `transactions` table by status instead of the old compatibility list tables.
- Staff status update endpoints now update central `transactions` rows.

### Routes That Create Central Transactions

- `POST /license/upload-license-renewal`
- `POST /api/submit-lost-document`
- `POST /api/ownership/form`
- `POST /api/vehicle-registration`
- `POST /api/renew-license`
- `POST /api/vehicle-conversion`
- `POST /api/vehicle-deregistration`
- `POST /api/vehicle-modification`
- `POST /api/vehicle-mortgage-release`

### Routes Intentionally Not Migrated Yet

- `POST /api/book-appointment`: left public and not transaction-backed for now because appointment ownership/auth expectations need confirmation.
- `POST /api/payment/license`: remains a payment record endpoint, not a separate service request transaction.
- Upload-only follow-up routes such as ownership/lost-document document upload keep saving documents to compatibility tables. Linking uploaded files to `transaction_documents` is left for the upload hardening/document workflow phase.

### Staff Routes Now Reading Central Transactions

- `GET /api/staff/received-transactions` reads central rows with `status = 'received'`.
- `GET /api/staff/in-progress-transactions` reads central rows with `status = 'in_progress'`.
- `GET /api/staff/completed-transactions` reads central rows with `status = 'completed'`.
- `PUT /api/staff/received-transactions/set-in-progress` updates central rows to `in_progress`.
- `PUT /api/staff/received-transactions/reject` updates central rows to `rejected`.

### Smoke Tests

- Passed: citizen login.
- Passed: staff login.
- Passed: admin login.
- Passed: citizen service submission without token returns `401`.
- Passed: `POST /api/submit-lost-document` with a citizen token succeeds.
- Passed: the lost-document request creates a central `transactions` row with `service_type = 'lost_document'` and `status = 'received'`.
- Passed: staff can view received transactions.
- Passed: admin can view received transactions.
- Passed: citizen cannot view staff received transactions.
- Passed: staff can view in-progress transactions.
- Passed: staff can view completed transactions.

### Fixes Made During Verification

- Updated `schema.sql` so existing old `lost_documents` enum columns are widened to `VARCHAR`, allowing current API values like `driving_license` and `lost`.
- Filtered central staff transaction lists to ignore old prototype rows that do not have a central `transaction_id` and service type.

### Remaining Blockers

- Central transactions are created after service-specific inserts, but there is not yet a full SQL transaction/rollback around both writes.
- Uploaded documents are not yet copied into `transaction_documents`.
- Assignment workflow is minimal; `set-in-progress` can mark central transactions in progress, but full admin assignment is not built yet.
- Some old prototype transaction rows still exist in the database and are ignored by the new central list query.
- Appointment booking is still public and not attached to central transactions.
- There are still no automated tests for transaction workflow.

### Recommended Next Phase

- Phase 5 should focus on citizen APIs:
  - "my transactions" from central `transactions`,
  - "my vehicles" using authenticated user context,
  - citizen-safe views of service request status,
  - and careful protection of remaining citizen service routes where frontend ownership expectations are clear.

## 9. Phase 5 Citizen APIs Results

### Citizen API Decisions

- Added authenticated citizen self-service routes under `/api/citizen`.
- All `/api/citizen/*` routes require a valid Bearer token and the `citizen` role.
- Citizen identity comes from `req.user` / `req.userId`, not from request body national IDs.
- Citizen transaction views read from the central `transactions` table created in Phase 4.
- Citizen transaction detail only returns a transaction if `transactions.user_id` matches the authenticated citizen.
- Related service records are returned only for an allowlisted set of service tables.
- Vehicle ownership lookup supports both the new `owner_id` column and old prototype `user_id` column for compatibility.

### New Citizen Routes

- `GET /api/citizen/me`
  - Returns safe profile fields: `id`, `full_name`, `national_id`, `email`, `role`, and `is_confirmed`.
  - Does not return `password_hash`.
- `GET /api/citizen/my-vehicles`
  - Returns vehicles where `owner_id = req.userId` or old compatibility `user_id = req.userId`.
- `GET /api/citizen/my-transactions`
  - Returns central transaction rows for the authenticated citizen.
  - Includes transaction number, service type, status, amount/payment fields, related record references, submitted date, and updated date.
- `GET /api/citizen/my-transactions/:id`
  - Returns only the authenticated citizen's own transaction.
  - Returns `404` if the transaction does not belong to the citizen.
  - Includes a safe related service record when the related table is allowlisted.

### Small Security Cleanup

- Staff user listing/search no longer returns `password_hash`.

### Smoke Tests

- Passed: citizen login.
- Passed: staff login.
- Passed: admin login.
- Passed: `GET /api/citizen/me` without token returns `401`.
- Passed: `GET /api/citizen/me` with citizen token returns safe user info.
- Passed: `/api/citizen/me` does not expose `password_hash`.
- Passed: `GET /api/citizen/my-vehicles` with citizen token.
- Passed: `GET /api/citizen/my-transactions` with citizen token.
- Passed: citizen can view own transaction detail.
- Passed: citizen cannot view another user's transaction detail.
- Passed: staff route protection still returns `401` without token.
- Passed: staff route protection still returns `403` with citizen token.
- Passed: staff route protection allows staff token.
- Passed: staff route protection allows admin token.
- Passed: Phase 4 central transaction flow still creates a central transaction row.

### Remaining Blockers

- Vehicle ownership is still mixed between old `user_id` and new `owner_id`; later cleanup should standardize it.
- Citizen transaction details expose raw compatibility service table fields for allowlisted tables; later API polish should normalize response shapes.
- Uploaded documents are still not exposed through citizen transaction details.
- Object-level access is implemented for citizen transaction detail, but not yet for every legacy service route.
- No automated test suite exists yet.

### Recommended Next Phase

- Phase 6 should focus on staff APIs:
  - sanitize staff-facing responses,
  - add central transaction detail/review endpoints,
  - support status transitions beyond received-to-in-progress/rejected,
  - and prepare document review hooks without implementing AI analysis yet.

### Safe Checkpoint For Continuation

- Completed:
  - Authenticated citizen profile endpoint.
  - Authenticated citizen vehicles endpoint.
  - Authenticated citizen transactions endpoint.
  - Authenticated citizen transaction detail endpoint with ownership check.
  - Staff user list/search no longer exposes `password_hash`.
- Files changed:
  - `routes/citizen.js`
  - `server.js`
  - `routes/staff/confirmUser.js`
  - `IMPLEMENTATION_PLAN.md`
- Additional quality checks passed:
  - Citizen/staff/admin login returns user plus token.
  - Login user payload omits `password_hash`.
  - Citizen routes reject missing token.
  - Citizen routes reject staff/admin tokens.
  - Citizen profile returns safe fields only.
  - Citizen vehicles route returns scoped results.
  - Citizen transactions route returns central rows.
  - Citizen can view own transaction detail.
  - Citizen cannot view another user's transaction detail.
  - Invalid citizen transaction detail returns `404`.
  - Staff users route still passes with staff token.
  - Staff users response omits `password_hash`.
  - Staff route still blocks citizen token.
  - Phase 4 central transaction creation still works.
- Unfinished:
  - Uploaded documents are not included in citizen transaction details.
  - Citizen transaction/detail response fields are not fully normalized.
  - Vehicle ownership still supports both old `user_id` and new `owner_id`.
  - No automated tests yet.
- Exact next step:
  - Start Phase 6: staff APIs for central transaction detail/review and status transitions, without adding AI analysis or admin dashboards.

## 10. Phase 6 Staff Transaction APIs Results

### Staff Transaction Workflow Decisions

- Added central staff transaction review endpoints under `/api/staff/transactions`.
- All new staff transaction endpoints inherit the existing `requireStaff` protection, so only `staff` and `admin` users can call them.
- Staff transaction detail reads from the central `transactions` table and can include an allowlisted related service record.
- Status changes now use explicit transition rules:
  - `received` can move to `in_progress`, `rejected`, or `transferred`.
  - `in_progress` can move to `completed`, `rejected`, or `transferred`.
  - `completed`, `rejected`, and `transferred` are terminal in the minimum workflow.
- `in_progress`, `completed`, `rejected`, and `transferred` actions record the acting staff/admin employee id when the user is linked in `employees`.
- Rejection requires a reason.
- Transfer requires a target and can store an optional note.
- Added `transfer_target` and `transfer_note` columns to `transactions` for the minimum transfer workflow.

### Endpoints Added

- `GET /api/staff/transactions/:id`
- `PUT /api/staff/transactions/:id/in-progress`
- `PUT /api/staff/transactions/:id/complete`
- `PUT /api/staff/transactions/:id/reject`
- `PUT /api/staff/transactions/:id/transfer`

### Existing Routes Kept Working

- `GET /api/staff/received-transactions`
- `GET /api/staff/in-progress-transactions`
- `GET /api/staff/completed-transactions`
- Existing batch compatibility actions on `/api/staff/received-transactions/*` remain available.

### Smoke Tests

- Passed: staff login returns a token.
- Passed: admin login returns a token.
- Passed: citizen login returns a token.
- Passed: `GET /api/staff/transactions/:id` without token returns `401`.
- Passed: `GET /api/staff/transactions/:id` with citizen token returns `403`.
- Passed: `GET /api/staff/transactions/:id` with staff token returns `200`.
- Passed: `GET /api/staff/transactions/:id` with admin token returns `200`.
- Passed: staff can move a `received` transaction to `in_progress`.
- Passed: staff can complete an `in_progress` transaction.
- Passed: staff can reject a `received` transaction with a reason.
- Passed: missing reject reason returns `400`.
- Passed: staff can transfer a `received` transaction with a target and note.
- Passed: missing transfer target returns `400`.
- Passed: invalid transition returns `400`.
- Passed: nonexistent transaction detail returns `404`.
- Passed: citizen `GET /api/citizen/my-transactions` still works after status changes.
- Passed: existing received/in-progress/completed staff lists still work.
- Passed: admin can process a `received` transaction through `in_progress` to `completed`.

### Failed Smoke Tests

- None in Phase 6 verification.

### Files Changed

- `services/transactions.js`
- `routes/staff/transactions.js`
- `server.js`
- `schema.sql`
- `IMPLEMENTATION_PLAN.md`

### Remaining Blockers

- Transfer target is stored as text and is not yet validated against a real employee/department assignment model.
- Batch compatibility endpoints still use the older broad update helper and do not yet enforce the full transition rules.
- Staff detail returns raw allowlisted compatibility service records; later phases should normalize staff response shapes.
- Uploaded documents are still not linked through `transaction_documents` in the staff detail response.
- No automated integration test suite exists yet; Phase 6 verification was done with live HTTP smoke tests.

### Recommended Next Phase

- Phase 7 should focus on minimum Admin APIs:
  - admin-safe user and employee management,
  - simple transaction assignment if needed,
  - admin transaction visibility,
  - and minimal dashboard counts only after the core transaction APIs remain stable.

## 11. Phase 7 Minimum Admin APIs Results

### Admin API Decisions

- Added minimum admin APIs under `/api/admin`.
- All admin routes require the `admin` role only via `requireAdmin`.
- Citizen and staff users cannot access admin routes.
- Admin user and employee responses do not expose `password_hash`.
- User status uses the existing `users.is_confirmed` field for the minimum workflow.
- `PUT /api/admin/users/:id/status` accepts `is_confirmed` or a simple status string such as `confirmed`, `enabled`, `rejected`, or `disabled`.
- Employee creation creates both:
  - a `users` row with role `staff` or `admin`,
  - and a linked `employees` row.
- Employee account passwords are hashed with `bcryptjs`.
- Transaction assignment uses the existing `transactions.assigned_employee_id` and `transactions.employee_id` fields.
- Dashboard summary is intentionally small and only returns total users, total staff, total transactions, and transactions grouped by status.
- Schema compatibility update: added missing `users.updated_at` for old local databases and made `users.birth_date` nullable so staff/admin accounts can be created without fake birth dates.

### Endpoints Added

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id/status`
- `GET /api/admin/employees`
- `POST /api/admin/employees`
- `GET /api/admin/transactions`
- `PUT /api/admin/transactions/:id/assign`
- `GET /api/admin/dashboard/summary`

### Smoke Tests

- Passed: admin login returns a token.
- Passed: citizen login returns a token.
- Passed: staff login returns a token.
- Passed: admin route without token returns `401`.
- Passed: admin route with citizen token returns `403`.
- Passed: admin route with staff token returns `403`.
- Passed: admin route with admin token returns `200`.
- Passed: admin can list users.
- Passed: admin user list does not expose `password_hash`.
- Passed: admin can view user details.
- Passed: admin user details do not expose `password_hash`.
- Passed: admin can update user status to disabled/rejected.
- Passed: admin can update user status back to confirmed/enabled.
- Passed: admin can list employees.
- Passed: admin employee list does not expose `password_hash`.
- Passed: admin can create a staff employee account.
- Passed: created employee response does not expose `password_hash`.
- Passed: admin can view central transactions.
- Passed: admin can assign a central transaction to an active staff employee.
- Passed: dashboard summary returns total users.
- Passed: dashboard summary returns total staff.
- Passed: dashboard summary returns total transactions.
- Passed: dashboard summary returns transactions by status.
- Passed: Phase 6 staff transaction detail still works.
- Passed: Phase 5 citizen `my-transactions` still works.

### Failed Smoke Tests

- None in Phase 7 verification.

### Files Changed

- `routes/admin.js`
- `server.js`
- `schema.sql`
- `IMPLEMENTATION_PLAN.md`

### Remaining Blockers

- User enable/disable is currently mapped to `is_confirmed`; there is no separate `account_status` column in schema v1.
- Admin-created staff/admin accounts do not collect full HR profile fields beyond the minimum `users` and `employees` columns.
- Transaction assignment does not notify the assigned employee and does not change transaction status.
- Admin dashboard summary is intentionally basic; charts, monthly analytics, reports, and trend data are not implemented.
- No automated integration test suite exists yet; verification was done with live HTTP smoke tests.

### Recommended Next Phase

- Phase 8 should focus on upload and security hardening:
  - file type and file size validation,
  - safer upload filenames,
  - private document access rules,
  - consistent input validation,
  - and linking uploaded files to `transaction_documents` where practical.

## 12. Phase 8 Code Quality And Portfolio Readiness Review

### Review Summary

- Reviewed backend structure, route organization, auth middleware, schema/docs, and obvious sensitive-data risks.
- Kept this phase limited to code quality, security cleanup, documentation, and portfolio readiness.
- Did not add product features, upload hardening, reports, notifications, complaints, AI analysis, or portal management.

### Cleanup Completed

- Removed the remaining staff smart-search `password_hash` exposure risk by replacing `SELECT * FROM users` with a safe user column list.
- Tightened internal user existence queries in registration and lost-document submission so they no longer fetch full user rows unnecessarily.
- Confirmed `.env` is ignored.
- Added `uploads/` and `coverage/` to `.gitignore`.
- Confirmed `.env.example` uses placeholders only.
- Added `README.md` with setup, architecture, seed accounts, implemented scope, and known limitations.
- Added `API_TESTING.md` with login/JWT usage, citizen endpoints, staff endpoints, admin endpoints, example bodies, and seed accounts.
- Documented that `node_modules/` and generated `uploads/` are already tracked locally and should be removed from the Git index before publishing to GitHub.

### Security Scan Notes

- No real DB password, JWT secret, Google API key, or obvious API token was found in source files outside placeholder documentation.
- `password_hash` remains only where needed for schema/seed/auth/password creation, or as defensive deletion from related records.
- `routes/gimini_licence.js` still references `GOOGLE_API_KEY` from environment variables only and remains unmounted from the main server.

### Route Naming Notes

- Current route names are mixed because several legacy prototype endpoints were kept for frontend compatibility.
- Newer APIs are consistently grouped under:
  - `/api/citizen`
  - `/api/staff`
  - `/api/admin`
- Legacy service endpoints should be normalized later only after frontend contracts are confirmed.

### Smoke Tests

- Passed: citizen login.
- Passed: staff login.
- Passed: admin login.
- Passed: login responses omit `password_hash`.
- Passed: citizen route without token returns `401`.
- Passed: citizen profile route works with citizen token.
- Passed: citizen `my-transactions` works with citizen token.
- Passed: citizen responses omit `password_hash`.
- Passed: staff users route works with staff token.
- Passed: staff smart-search route works with staff token.
- Passed: staff users response omits `password_hash`.
- Passed: staff smart-search response omits `password_hash`.
- Passed: staff transaction detail works with staff token.
- Passed: citizen token cannot access staff transaction detail.
- Passed: staff transaction detail response omits `password_hash`.
- Passed: admin route without token returns `401`.
- Passed: admin route with staff token returns `403`.
- Passed: admin users route works with admin token.
- Passed: admin employees route works with admin token.
- Passed: admin transactions route works with admin token.
- Passed: admin dashboard summary works with admin token.
- Passed: admin responses omit `password_hash`.

### Remaining Portfolio Readiness Items

- Remove tracked `node_modules/` and generated `uploads/` from the Git index before publishing.
- Add automated integration tests.
- Harden uploads and private document access.
- Normalize legacy response formats.
- Add centralized validation and error response helpers.
- Decide whether to remove, rename, or document the standalone `routes/gimini_licence.js` experimental server.

### Recommended Next Phase

- Phase 9 should focus on testing and bug fixing:
  - build an automated smoke/integration test suite,
  - cover auth and role access,
  - cover central transaction creation and status transitions,
  - cover citizen/staff/admin route permissions,
  - and then proceed to upload hardening as a separate security phase.

## 13. Phase 9 Upload And Security Hardening Results

### Upload Security Decisions

- Added a shared upload helper for the main backend upload routes.
- Allowed upload types are limited to:
  - PDF,
  - JPG/JPEG,
  - PNG.
- Default maximum file size is 5 MB and can be configured with `UPLOAD_MAX_FILE_SIZE`.
- Uploaded filenames are now generated with UUIDs instead of trusting original filenames.
- Upload directories are created safely under the backend `uploads` root when needed.
- Removed public static serving for `/uploads`; private documents must be accessed through authenticated document APIs.
- Added path-boundary checks before storing or downloading files.
- Existing upload endpoint URLs were kept for compatibility.
- `routes/gimini_licence.js` remains a standalone experimental route file and was not migrated because it is not mounted in `server.js`.

### Transaction Document Metadata

- Extended `transaction_documents` with:
  - `original_name`
  - `stored_name`
  - `mime_type`
  - `file_size`
  - `uploaded_by`
- Upload routes now save metadata to `transaction_documents` when a central transaction exists.
- Document metadata is linked by central `transactions.id`, not the public transaction number.
- Existing compatibility service document tables are still kept where they already existed.

### Routes Migrated To Shared Upload Security

- `POST /license/upload-license-renewal`
- `POST /api/upload-lost-documents/:requestId`
- `POST /api/ownership/upload/:transferId`
- `POST /api/vehicle-registration`
- `POST /api/renew-license`
- `POST /api/vehicle-deregistration`
- `POST /api/vehicle-modification`
- `POST /api/vehicle-mortgage-release`

### Document Access APIs Added

- `GET /api/documents/transactions/:transactionId`
  - Citizen can list documents only for their own transaction.
  - Staff/admin can list documents for central transactions.
- `GET /api/documents/:id/download`
  - Citizen can download only documents linked to their own transactions.
  - Staff/admin can download documents linked to central transactions.

### Documentation Updated

- `.env.example` documents `UPLOAD_MAX_FILE_SIZE`.
- `README.md` documents private upload behavior and document access routes.
- `API_TESTING.md` documents Postman upload testing and document access checks.

### Smoke Tests

- Passed: citizen login works.
- Passed: staff login works.
- Passed: admin login works.
- Passed: citizen can submit a license-renewal upload request.
- Passed: central transaction is created for the upload request.
- Passed: uploaded document metadata is stored in `transaction_documents`.
- Passed: citizen can list own transaction documents.
- Passed: citizen can download own transaction document.
- Passed: another citizen cannot download that document.
- Passed: staff can download the transaction document.
- Passed: admin can download the transaction document.
- Passed: invalid file type is rejected with `400`.
- Passed: oversized file is rejected with `413`.
- Passed: `/uploads` is not publicly served.
- Passed: Phase 5 citizen `my-transactions` still works.
- Passed: Phase 6 staff transaction detail still works.
- Passed: Phase 7 admin dashboard summary still works.
- Passed: no `password_hash` exposure in smoke-test responses.

### Failed Smoke Tests

- None in Phase 9 verification.

### Files Changed

- `services/uploadSecurity.js`
- `routes/documents.js`
- `server.js`
- `schema.sql`
- `.env.example`
- `README.md`
- `API_TESTING.md`
- `routes/licenseRenewal.js`
- `routes/lostDocuments.js`
- `routes/ownershipTransfer.js`
- `routes/vehicleRegistration.js`
- `routes/vehicleLicenseRenewal.js`
- `routes/vehicleDeregistration.js`
- `routes/vehicleModification.js`
- `routes/vehicleMortgageRelease.js`
- `IMPLEMENTATION_PLAN.md`

### Remaining Blockers

- No malware scanning or content inspection beyond MIME/extension allowlisting.
- Uploaded files are still stored on local disk, not private object storage.
- Some legacy upload routes still save compatibility file paths in older service tables.
- Document replacement currently uses the existing unique `(transaction_id, field_name)` behavior, so repeated uploads for the same field replace metadata.
- Uploaded documents are not yet shown inside citizen/staff transaction detail responses, though they are available through `/api/documents`.
- No automated upload/security integration tests exist yet.

### Recommended Next Phase

- Next phase should focus on automated testing and bug fixing:
  - convert the smoke tests into repeatable scripts,
  - cover auth, roles, transaction workflow, uploads, document access, and admin assignment,
  - add negative tests for permissions and validation,
  - and clean up tracked `node_modules/` / generated uploads before publishing to GitHub.

## 14. Phase 10 Automated Smoke Tests Results

### Test Setup Decisions

- Added a lightweight smoke test runner without adding new dependencies.
- The test runner uses built-in Node.js `fetch`, `FormData`, and `Blob`.
- `npm test` and `npm run smoke` both run `scripts/smoke-test.js`.
- By default, the runner starts `server.js` on port `3100` so it does not collide with a normal development server on port `3000`.
- The runner uses the seeded accounts from `seed.sql`.
- The test runner expects a local MySQL database configured through environment variables or `.env`.
- If `JWT_SECRET` is missing, the runner uses a local-only test secret for the spawned test server.

### Automated Coverage

- Citizen login.
- Staff login.
- Admin login.
- Login responses omit `password_hash`.
- Protected citizen route returns `401` without token.
- Admin route returns `403` for staff token.
- Citizen `GET /api/citizen/me`.
- Citizen `GET /api/citizen/my-transactions`.
- License-renewal upload creates a central transaction.
- Upload response includes `transaction_documents` metadata.
- Staff transaction detail returns `401` without token.
- Staff transaction detail returns `403` with citizen token.
- Staff transaction detail passes with staff token.
- Admin dashboard summary passes with admin token.
- Citizen can list and download own transaction document.
- Another citizen cannot download that document.
- Staff can download the transaction document.

### Manual Testing Still Recommended

- Full matrix of every legacy service request route.
- Invalid upload type and oversized upload checks, because the automated smoke suite keeps uploads small and fast.
- Staff status transition edge cases beyond the happy-path detail permission check.
- Admin employee creation and transaction assignment, already smoke-tested manually in Phase 7.
- Browser/Postman verification for frontend integration contracts.

### Smoke Test Run

- Command used on Windows PowerShell:
  - `npm.cmd test`
- Result:
  - `33/33 smoke checks passed`
- Follow-up fix:
  - Improved smoke-test readiness diagnostics so missing/incorrect MySQL environment values show the database connection error instead of only timing out.
  - Documented that `.env` must exist, or equivalent `DB_*` variables must be set in the shell, before running `npm test`.

### Files Changed

- `package.json`
- `scripts/smoke-test.js`
- `README.md`
- `API_TESTING.md`
- `IMPLEMENTATION_PLAN.md`

### Remaining Blockers

- Tests create real rows in the local database and do not yet clean them up.
- There is no isolated test database lifecycle or fixture reset.
- No assertion framework/report format is installed yet.
- Some deeper workflows are still manual, especially the full legacy route matrix and admin assignment.
- Tracked `node_modules/` and generated `uploads/` still need to be removed from the Git index before GitHub publishing.

### Portfolio Readiness Recommendation

- The backend is now portfolio-ready from an MVP API, documentation, and repeatable smoke-test perspective.
- Before publishing, remove tracked `node_modules/` and generated upload files from Git, then commit the code and docs in a clean checkpoint.

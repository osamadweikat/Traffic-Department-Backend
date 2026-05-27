USE software;

INSERT INTO users (full_name, national_id, birth_date, email, password_hash, role, phone, is_confirmed)
VALUES
  ('Test Citizen', '123456789', '1995-01-15', 'citizen@example.com', '$2b$10$nm7oHHbIxIdWOcqasW.8ZO2Q8W3TzfJwAQt0q4f9VNJTpezh96Dv6', 'citizen', '0599000001', 1),
  ('Test Staff', '987654321', '1990-03-20', 'staff@example.com', '$2b$10$gNFXCyqGH2jZakJ3RIg.keZ3xovC2nbopnzfGrhKSxj6V3x3mOIQW', 'staff', '0599000002', 1),
  ('Test Admin', '111222333', '1988-07-10', 'admin@example.com', '$2b$10$900kwi45rOICzGGV13bBEe/Gc0lIb8/k6fi9VzCSuvrS6yObTmj7y', 'admin', '0599000003', 1)
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  birth_date = VALUES(birth_date),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  phone = VALUES(phone),
  is_confirmed = VALUES(is_confirmed);

SELECT id INTO @citizen_id FROM users WHERE national_id = '123456789' LIMIT 1;
SELECT id INTO @staff_user_id FROM users WHERE national_id = '987654321' LIMIT 1;
SELECT id INTO @admin_user_id FROM users WHERE national_id = '111222333' LIMIT 1;

INSERT INTO employees (user_id, employee_number, full_name, email, phone, department, role, status, hire_date)
VALUES
  (@staff_user_id, 'EMP-001', 'Test Staff', 'staff@example.com', '0599000002', 'Transactions', 'staff', 'active', '2024-01-01'),
  (@admin_user_id, 'ADM-001', 'Test Admin', 'admin@example.com', '0599000003', 'Administration', 'admin', 'active', '2023-01-01')
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  full_name = VALUES(full_name),
  email = VALUES(email),
  phone = VALUES(phone),
  department = VALUES(department),
  role = VALUES(role),
  status = VALUES(status);

SELECT id INTO @employee_id FROM employees WHERE employee_number = 'EMP-001' LIMIT 1;

UPDATE vehicles
SET user_id = @citizen_id,
    owner_id = @citizen_id,
    vehicle_type = 'private',
    vehicle_make = 'Hyundai',
    vehicle_model = 'Elantra',
    fuel_type = 'gasoline',
    license_expiry = '2026-12-31',
    color = 'white'
WHERE plate_number = 'NABLUS123';

INSERT INTO vehicles (user_id, owner_id, plate_number, vehicle_type, vehicle_make, vehicle_model, fuel_type, license_expiry, color)
SELECT @citizen_id, @citizen_id, 'NABLUS123', 'private', 'Hyundai', 'Elantra', 'gasoline', '2026-12-31', 'white'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'NABLUS123');

UPDATE vehicles
SET user_id = @citizen_id,
    owner_id = @citizen_id,
    vehicle_type = 'commercial',
    vehicle_make = 'Toyota',
    vehicle_model = 'Hiace',
    fuel_type = 'diesel',
    license_expiry = '2026-06-30',
    color = 'silver'
WHERE plate_number = 'PAL4567';

INSERT INTO vehicles (user_id, owner_id, plate_number, vehicle_type, vehicle_make, vehicle_model, fuel_type, license_expiry, color)
SELECT @citizen_id, @citizen_id, 'PAL4567', 'commercial', 'Toyota', 'Hiace', 'diesel', '2026-06-30', 'silver'
WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE plate_number = 'PAL4567');

SELECT id INTO @vehicle_id FROM vehicles WHERE plate_number = 'NABLUS123' LIMIT 1;
SELECT id INTO @vehicle2_id FROM vehicles WHERE plate_number = 'PAL4567' LIMIT 1;

UPDATE transactions
SET user_id = @citizen_id, vehicle_id = @vehicle_id, employee_id = @employee_id,
    citizen_name = 'Test Citizen', national_id = '123456789', transaction_type = 'license_renewal',
    status = 'received', amount = 120.00, currency = 'ILS', payment_method = 'cash'
WHERE transaction_id = 'TRX-1001';
INSERT INTO transactions (transaction_id, user_id, vehicle_id, employee_id, citizen_name, national_id, transaction_type, status, amount, currency, payment_method, submitted_at)
SELECT 'TRX-1001', @citizen_id, @vehicle_id, @employee_id, 'Test Citizen', '123456789', 'license_renewal', 'received', 120.00, 'ILS', 'cash', '2026-05-01 10:00:00'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE transaction_id = 'TRX-1001');

UPDATE transactions
SET user_id = @citizen_id, vehicle_id = @vehicle_id, employee_id = @employee_id,
    citizen_name = 'Test Citizen', national_id = '123456789', transaction_type = 'vehicle_renewal',
    status = 'in_progress', amount = 180.00, currency = 'ILS', payment_method = 'visa'
WHERE transaction_id = 'TRX-1002';
INSERT INTO transactions (transaction_id, user_id, vehicle_id, employee_id, citizen_name, national_id, transaction_type, status, amount, currency, payment_method, submitted_at)
SELECT 'TRX-1002', @citizen_id, @vehicle_id, @employee_id, 'Test Citizen', '123456789', 'vehicle_renewal', 'in_progress', 180.00, 'ILS', 'visa', '2026-05-02 11:30:00'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE transaction_id = 'TRX-1002');

UPDATE transactions
SET user_id = @citizen_id, vehicle_id = @vehicle2_id, employee_id = @employee_id,
    citizen_name = 'Test Citizen', national_id = '123456789', transaction_type = 'ownership_transfer',
    status = 'completed', amount = 250.00, currency = 'ILS', payment_method = 'jawwal_pay'
WHERE transaction_id = 'TRX-1003';
INSERT INTO transactions (transaction_id, user_id, vehicle_id, employee_id, citizen_name, national_id, transaction_type, status, amount, currency, payment_method, submitted_at)
SELECT 'TRX-1003', @citizen_id, @vehicle2_id, @employee_id, 'Test Citizen', '123456789', 'ownership_transfer', 'completed', 250.00, 'ILS', 'jawwal_pay', '2026-05-03 09:15:00'
WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE transaction_id = 'TRX-1003');

SELECT id INTO @transaction_id FROM transactions WHERE transaction_id = 'TRX-1001' LIMIT 1;

INSERT INTO transaction_documents (transaction_id, document_type, field_name, file_name, file_path, validation_status)
VALUES
  (@transaction_id, 'personal_id_card', 'personal_id_card', 'sample-id.jpg', 'uploads/sample-id.jpg', 'pending'),
  (@transaction_id, 'medical_check', 'medical_check', 'sample-medical.jpg', 'uploads/sample-medical.jpg', 'pending')
ON DUPLICATE KEY UPDATE
  document_type = VALUES(document_type),
  file_name = VALUES(file_name),
  file_path = VALUES(file_path),
  validation_status = VALUES(validation_status);

UPDATE violations
SET user_id = @citizen_id, vehicle_id = @vehicle_id, national_id = '123456789',
    plate_number = 'NABLUS123', violation = 'Speeding', violation_date = '2026-04-15',
    amount = 400.00, officer = 'Officer Ali', location = 'Main Street',
    notes = 'Exceeded speed limit', is_paid = 0
WHERE violation_number = 'VIO-1001';
INSERT INTO violations (violation_number, user_id, vehicle_id, national_id, plate_number, violation, violation_date, amount, officer, location, notes, is_paid)
SELECT 'VIO-1001', @citizen_id, @vehicle_id, '123456789', 'NABLUS123', 'Speeding', '2026-04-15', 400.00, 'Officer Ali', 'Main Street', 'Exceeded speed limit', 0
WHERE NOT EXISTS (SELECT 1 FROM violations WHERE violation_number = 'VIO-1001');

UPDATE violations
SET user_id = @citizen_id, vehicle_id = @vehicle_id, national_id = '123456789',
    plate_number = 'NABLUS123', violation = 'Illegal parking', violation_date = '2026-04-20',
    amount = 200.00, officer = 'Officer Sara', location = 'City Center',
    notes = 'Parked on sidewalk', is_paid = 1
WHERE violation_number = 'VIO-1002';
INSERT INTO violations (violation_number, user_id, vehicle_id, national_id, plate_number, violation, violation_date, amount, officer, location, notes, is_paid)
SELECT 'VIO-1002', @citizen_id, @vehicle_id, '123456789', 'NABLUS123', 'Illegal parking', '2026-04-20', 200.00, 'Officer Sara', 'City Center', 'Parked on sidewalk', 1
WHERE NOT EXISTS (SELECT 1 FROM violations WHERE violation_number = 'VIO-1002');

INSERT INTO appointments (city, branch, appointment_date, appointment_time, qr_data)
VALUES
  ('Nablus', 'Main Branch', '2026-05-25', '09:30:00', 'Nablus - Main Branch | 2026-05-25 | 09:30');

INSERT INTO theoretical_results (national_id, name, exam_date, license_grade, max_score, score, needs_examiner, pass_mark, question_count)
VALUES
  ('123456789', 'Test Citizen', '2026-04-10', 'B', 100, 88, 0, 80, 30);

INSERT INTO practical_results (national_id, name, exam_date, license_grade, score_status, school_name)
VALUES
  ('123456789', 'Test Citizen', '2026-04-20', 'B', 'passed', 'Nablus Driving School');

INSERT INTO received_transactions (transaction_number, citizen_name, national_id, transaction_type, payment_method, status, received_date)
VALUES
  ('TRX-1001', 'Test Citizen', '123456789', 'license_renewal', 'cash', 'received', '2026-05-01 10:00:00')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  payment_method = VALUES(payment_method);

INSERT INTO in_progress_transactions (transaction_number, citizen_name, national_id, transaction_type, assigned_employee_id, received_date)
VALUES
  ('TRX-1002', 'Test Citizen', '123456789', 'vehicle_renewal', @employee_id, '2026-05-02 11:30:00')
ON DUPLICATE KEY UPDATE
  assigned_employee_id = VALUES(assigned_employee_id),
  received_date = VALUES(received_date);

INSERT INTO completed_transactions (transaction_number, citizen_name, national_id, transaction_type, date, time, processing_duration_minutes)
VALUES
  ('TRX-1003', 'Test Citizen', '123456789', 'ownership_transfer', '2026-05-03', '12:00:00', 165)
ON DUPLICATE KEY UPDATE
  date = VALUES(date),
  time = VALUES(time),
  processing_duration_minutes = VALUES(processing_duration_minutes);

INSERT INTO messages (conversation_id, sender_id, reciever_id, subject, `from`, date, body)
VALUES
  (1, 'admin', 'staff', 'Welcome', 'Administration', '2026-05-01', 'Welcome to the Traffic Department staff portal.');

INSERT INTO employee_details (employee_id, completed_count, rejected_count, delayed_count, average_processing_minutes)
VALUES
  (@employee_id, 12, 2, 1, 85)
ON DUPLICATE KEY UPDATE
  completed_count = VALUES(completed_count),
  rejected_count = VALUES(rejected_count),
  delayed_count = VALUES(delayed_count),
  average_processing_minutes = VALUES(average_processing_minutes);

INSERT INTO transaction_distribution (employee_id, type, count)
VALUES
  (@employee_id, 'license_renewal', 5),
  (@employee_id, 'vehicle_renewal', 4),
  (@employee_id, 'ownership_transfer', 3)
ON DUPLICATE KEY UPDATE
  count = VALUES(count);

INSERT INTO evaluations (employee_id, month_label, discipline_score, commitment_score, communication_score, notes)
VALUES
  (@employee_id, '2026-05', 8, 9, 8, 'Seed evaluation for testing monthly report.')
ON DUPLICATE KEY UPDATE
  discipline_score = VALUES(discipline_score),
  commitment_score = VALUES(commitment_score),
  communication_score = VALUES(communication_score),
  notes = VALUES(notes);

INSERT INTO reports (employee_id, month_label, summary, supervisor_feedback)
VALUES
  (@employee_id, '2026-05', 'Seed monthly report summary.', 'Good progress on assigned transactions.')
ON DUPLICATE KEY UPDATE
  summary = VALUES(summary),
  supervisor_feedback = VALUES(supervisor_feedback);

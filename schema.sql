CREATE DATABASE IF NOT EXISTS software
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE software;

DELIMITER //

CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table_name
      AND column_name = p_column_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL UNIQUE,
  birth_date DATE NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('citizen', 'staff', 'admin') NOT NULL DEFAULT 'citizen',
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  is_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CALL add_column_if_missing('users', 'role', "ENUM('citizen', 'staff', 'admin') NOT NULL DEFAULT 'citizen'");
CALL add_column_if_missing('users', 'phone', 'VARCHAR(30) NULL');
CALL add_column_if_missing('users', 'address', 'VARCHAR(255) NULL');
CALL add_column_if_missing('users', 'is_confirmed', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL add_column_if_missing('users', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
ALTER TABLE users MODIFY birth_date DATE NULL;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL,
  department VARCHAR(100) NOT NULL,
  role ENUM('staff', 'admin') NOT NULL DEFAULT 'staff',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  hire_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NULL,
  plate_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_type VARCHAR(100) NOT NULL,
  vehicle_make VARCHAR(100) NULL,
  vehicle_model VARCHAR(100) NULL,
  fuel_type VARCHAR(50) NULL,
  license_expiry DATE NULL,
  color VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CALL add_column_if_missing('vehicles', 'owner_id', 'INT NULL');
CALL add_column_if_missing('vehicles', 'vehicle_type', 'VARCHAR(100) NULL');
CALL add_column_if_missing('vehicles', 'vehicle_make', 'VARCHAR(100) NULL');
CALL add_column_if_missing('vehicles', 'vehicle_model', 'VARCHAR(100) NULL');
CALL add_column_if_missing('vehicles', 'fuel_type', 'VARCHAR(50) NULL');
CALL add_column_if_missing('vehicles', 'license_expiry', 'DATE NULL');

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NULL,
  vehicle_id INT NULL,
  employee_id INT NULL,
  citizen_name VARCHAR(150) NULL,
  national_id VARCHAR(30) NULL,
  transaction_type VARCHAR(100) NOT NULL,
  service_type VARCHAR(100) NULL,
  status ENUM('received', 'in_progress', 'completed', 'rejected', 'transferred') NOT NULL DEFAULT 'received',
  amount DECIMAL(10, 2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ILS',
  payment_method VARCHAR(50) NULL,
  related_table VARCHAR(100) NULL,
  related_record_id INT NULL,
  assigned_employee_id INT NULL,
  notes TEXT NULL,
  rejection_reason TEXT NULL,
  transfer_target VARCHAR(100) NULL,
  transfer_note TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_transactions_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_transactions_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE SET NULL
);

CALL add_column_if_missing('transactions', 'transaction_id', 'VARCHAR(50) NULL');
CALL add_column_if_missing('transactions', 'user_id', 'INT NULL');
CALL add_column_if_missing('transactions', 'vehicle_id', 'INT NULL');
CALL add_column_if_missing('transactions', 'employee_id', 'INT NULL');
CALL add_column_if_missing('transactions', 'citizen_name', 'VARCHAR(150) NULL');
CALL add_column_if_missing('transactions', 'transaction_type', 'VARCHAR(100) NULL');
CALL add_column_if_missing('transactions', 'service_type', 'VARCHAR(100) NULL');
CALL add_column_if_missing('transactions', 'status', "ENUM('received', 'in_progress', 'completed', 'rejected', 'transferred') NOT NULL DEFAULT 'received'");
CALL add_column_if_missing('transactions', 'currency', "VARCHAR(10) NOT NULL DEFAULT 'ILS'");
CALL add_column_if_missing('transactions', 'payment_method', 'VARCHAR(50) NULL');
CALL add_column_if_missing('transactions', 'related_table', 'VARCHAR(100) NULL');
CALL add_column_if_missing('transactions', 'related_record_id', 'INT NULL');
CALL add_column_if_missing('transactions', 'assigned_employee_id', 'INT NULL');
CALL add_column_if_missing('transactions', 'notes', 'TEXT NULL');
CALL add_column_if_missing('transactions', 'rejection_reason', 'TEXT NULL');
CALL add_column_if_missing('transactions', 'transfer_target', 'VARCHAR(100) NULL');
CALL add_column_if_missing('transactions', 'transfer_note', 'TEXT NULL');
CALL add_column_if_missing('transactions', 'submitted_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('transactions', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

CREATE TABLE IF NOT EXISTS transaction_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NULL,
  stored_name VARCHAR(255) NULL,
  mime_type VARCHAR(100) NULL,
  file_size INT NULL,
  uploaded_by INT NULL,
  validation_status ENUM('pending', 'correct', 'incorrect', 'questionable') NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_transaction_documents_field (transaction_id, field_name),
  CONSTRAINT fk_transaction_documents_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ON DELETE CASCADE
);

CALL add_column_if_missing('transaction_documents', 'original_name', 'VARCHAR(255) NULL');
CALL add_column_if_missing('transaction_documents', 'stored_name', 'VARCHAR(255) NULL');
CALL add_column_if_missing('transaction_documents', 'mime_type', 'VARCHAR(100) NULL');
CALL add_column_if_missing('transaction_documents', 'file_size', 'INT NULL');
CALL add_column_if_missing('transaction_documents', 'uploaded_by', 'INT NULL');

CREATE TABLE IF NOT EXISTS violations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  violation_number VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NULL,
  vehicle_id INT NULL,
  national_id VARCHAR(30) NULL,
  plate_number VARCHAR(50) NULL,
  violation VARCHAR(150) NOT NULL,
  violation_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  officer VARCHAR(100) NULL,
  location VARCHAR(255) NULL,
  notes TEXT NULL,
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_violations_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_violations_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON DELETE SET NULL
);

CALL add_column_if_missing('violations', 'violation_number', 'VARCHAR(50) NULL');
CALL add_column_if_missing('violations', 'user_id', 'INT NULL');
CALL add_column_if_missing('violations', 'vehicle_id', 'INT NULL');
CALL add_column_if_missing('violations', 'national_id', 'VARCHAR(30) NULL');
CALL add_column_if_missing('violations', 'plate_number', 'VARCHAR(50) NULL');
CALL add_column_if_missing('violations', 'violation', 'VARCHAR(150) NULL');
CALL add_column_if_missing('violations', 'violation_date', 'DATE NULL');
CALL add_column_if_missing('violations', 'is_paid', 'TINYINT(1) NOT NULL DEFAULT 0');

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  branch VARCHAR(150) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  qr_data VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_renewals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  original_license VARCHAR(255) NOT NULL,
  personal_id_card VARCHAR(255) NOT NULL,
  personal_photo VARCHAR(255) NOT NULL,
  medical_check VARCHAR(255) NOT NULL,
  fines_clearance VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_license_renewals_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS license_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  license_type VARCHAR(100) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_license_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

ALTER TABLE license_payments MODIFY COLUMN duration VARCHAR(50) NOT NULL;

CREATE TABLE IF NOT EXISTS lost_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id VARCHAR(30) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  plate_number VARCHAR(50) NULL,
  document_type VARCHAR(100) NOT NULL,
  replacement_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE lost_documents MODIFY COLUMN owner_id VARCHAR(30) NOT NULL;
ALTER TABLE lost_documents MODIFY COLUMN owner_name VARCHAR(150) NOT NULL;
ALTER TABLE lost_documents MODIFY COLUMN plate_number VARCHAR(50) NULL;
ALTER TABLE lost_documents MODIFY COLUMN document_type VARCHAR(100) NOT NULL;
ALTER TABLE lost_documents MODIFY COLUMN replacement_type VARCHAR(100) NOT NULL;

CREATE TABLE IF NOT EXISTS lost_document_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lost_document_files_request FOREIGN KEY (request_id) REFERENCES lost_documents(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ownership_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id VARCHAR(30) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  fuel_type VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ownership_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ownership_documents_transfer FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ownership_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ILS',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ownership_payments_transfer FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS theoretical_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  national_id VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  exam_date DATE NOT NULL,
  license_grade VARCHAR(50) NOT NULL,
  max_score INT NOT NULL,
  score INT NOT NULL,
  needs_examiner TINYINT(1) NOT NULL DEFAULT 0,
  pass_mark INT NOT NULL DEFAULT 80,
  question_count INT NOT NULL DEFAULT 30
);

CREATE TABLE IF NOT EXISTS practical_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  national_id VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  exam_date DATE NOT NULL,
  license_grade VARCHAR(50) NOT NULL,
  score_status ENUM('passed', 'failed') NOT NULL,
  school_name VARCHAR(150) NULL
);

CREATE TABLE IF NOT EXISTS vehicle_renewals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  vehicle_model VARCHAR(100) NULL,
  plate_number VARCHAR(50) NOT NULL,
  license_expiry DATE NULL,
  ownership_proof VARCHAR(255) NULL,
  insurance_document VARCHAR(255) NULL,
  technical_inspection VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  vehicle_make VARCHAR(100) NULL,
  ownership_proof VARCHAR(500) NULL,
  insurance_document VARCHAR(500) NULL,
  technical_report VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_deregistrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  deregistration_reason TEXT NOT NULL,
  license_copy VARCHAR(255) NULL,
  plate_photo VARCHAR(255) NULL,
  payment_proof VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_modifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  modification_type VARCHAR(100) NOT NULL,
  description TEXT NULL,
  ownership_document VARCHAR(255) NULL,
  modification_certificate VARCHAR(255) NULL,
  payment_proof VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_conversion_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id VARCHAR(30) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  current_status VARCHAR(100) NULL,
  conversion_type VARCHAR(100) NOT NULL,
  reason TEXT NULL,
  total_amount DECIMAL(10, 2) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ILS',
  documents JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_mortgage_release (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  vehicle_model VARCHAR(100) NULL,
  plate_number VARCHAR(50) NOT NULL,
  release_date DATE NULL,
  is_release TINYINT(1) NOT NULL DEFAULT 1,
  mortgage_document VARCHAR(500) NULL,
  ownership_proof VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS received_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(50) NOT NULL UNIQUE,
  citizen_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  payment_method VARCHAR(50) NULL,
  status ENUM('received', 'in_progress', 'rejected') NOT NULL DEFAULT 'received',
  rejection_reason TEXT NULL,
  received_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS in_progress_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(50) NOT NULL UNIQUE,
  citizen_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  assigned_employee_id INT NULL,
  received_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_in_progress_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS completed_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(50) NOT NULL UNIQUE,
  citizen_name VARCHAR(150) NOT NULL,
  national_id VARCHAR(30) NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  processing_duration_minutes INT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(190) NOT NULL,
  `from` VARCHAR(150) NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  body TEXT NULL
);

CALL add_column_if_missing('messages', 'subject', 'VARCHAR(190) NULL');
CALL add_column_if_missing('messages', 'from', 'VARCHAR(150) NULL');

CREATE TABLE IF NOT EXISTS employee_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  completed_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  delayed_count INT NOT NULL DEFAULT 0,
  average_processing_minutes INT NULL,
  UNIQUE KEY uq_employee_details_employee (employee_id),
  CONSTRAINT fk_employee_details_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_distribution (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  type VARCHAR(100) NOT NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_transaction_distribution_employee_type (employee_id, type),
  CONSTRAINT fk_transaction_distribution_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  month_label VARCHAR(20) NOT NULL,
  discipline_score TINYINT NULL,
  commitment_score TINYINT NULL,
  communication_score TINYINT NULL,
  notes TEXT NULL,
  UNIQUE KEY uq_evaluations_employee_month (employee_id, month_label),
  CONSTRAINT fk_evaluations_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  month_label VARCHAR(20) NOT NULL,
  summary TEXT NULL,
  supervisor_feedback TEXT NULL,
  UNIQUE KEY uq_reports_employee_month (employee_id, month_label),
  CONSTRAINT fk_reports_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
);

DROP PROCEDURE IF EXISTS add_column_if_missing;

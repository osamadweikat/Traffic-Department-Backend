const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const safeUserSelect = `
  id,
  full_name,
  national_id,
  birth_date,
  email,
  role,
  phone,
  address,
  is_confirmed,
  created_at,
  updated_at
`;

const transactionSelect = `
  id,
  transaction_id,
  user_id,
  vehicle_id,
  citizen_name,
  national_id,
  COALESCE(service_type, transaction_type) AS service_type,
  status,
  amount,
  currency,
  payment_method,
  assigned_employee_id,
  employee_id,
  related_table,
  related_record_id,
  notes,
  rejection_reason,
  transfer_target,
  transfer_note,
  submitted_at,
  updated_at
`;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'confirmed', 'enabled', 'active', 'approved'].includes(normalized)) {
      return true;
    }
    if (['false', 'rejected', 'disabled', 'inactive', 'blocked'].includes(normalized)) {
      return false;
    }
  }
  return null;
}

async function getSafeUserById(id) {
  const [rows] = await db.query(
    `SELECT ${safeUserSelect} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function getTransactionById(id) {
  const [rows] = await db.query(
    `SELECT ${transactionSelect}
     FROM transactions
     WHERE id = ?
       AND transaction_id IS NOT NULL
       AND COALESCE(service_type, transaction_type) IS NOT NULL
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT ${safeUserSelect}
       FROM users
       ORDER BY created_at DESC, id DESC`
    );

    res.json(users);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await getSafeUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [employees] = await db.query(
      `SELECT id, user_id, employee_number, full_name, email, phone, department, role, status, hire_date, created_at
       FROM employees
       WHERE user_id = ?
       LIMIT 1`,
      [user.id]
    );

    res.json({
      user,
      employee: employees[0] || null
    });
  } catch (err) {
    console.error('Error fetching admin user detail:', err);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
});

router.put('/users/:id/status', async (req, res) => {
  const body = req.body || {};
  const statusValue = Object.prototype.hasOwnProperty.call(body, 'is_confirmed')
    ? body.is_confirmed
    : body.status;
  const isConfirmed = normalizeBoolean(statusValue);

  if (isConfirmed === null) {
    return res.status(400).json({
      message: 'A valid status or is_confirmed value is required'
    });
  }

  try {
    const [result] = await db.query(
      'UPDATE users SET is_confirmed = ? WHERE id = ?',
      [isConfirmed ? 1 : 0, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await getSafeUserById(req.params.id);
    res.json({
      message: isConfirmed ? 'User confirmed/enabled' : 'User rejected/disabled',
      user
    });
  } catch (err) {
    console.error('Error updating admin user status:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const [employees] = await db.query(
      `SELECT
        e.id,
        e.user_id,
        e.employee_number,
        e.full_name,
        e.email,
        e.phone,
        e.department,
        e.role,
        e.status,
        e.hire_date,
        e.created_at,
        u.national_id,
        u.is_confirmed
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ORDER BY e.created_at DESC, e.id DESC`
    );

    res.json(employees);
  } catch (err) {
    console.error('Error fetching admin employees:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

router.post('/employees', async (req, res) => {
  const body = req.body || {};
  const fullName = cleanText(body.full_name);
  const nationalId = cleanText(body.national_id);
  const email = cleanText(body.email);
  const password = cleanText(body.password);
  const employeeNumber = cleanText(body.employee_number);
  const department = cleanText(body.department);
  const role = cleanText(body.role || 'staff').toLowerCase();
  const phone = cleanText(body.phone) || null;
  const hireDate = cleanText(body.hire_date) || null;

  if (!fullName || !nationalId || !email || !password || !employeeNumber || !department) {
    return res.status(400).json({
      message: 'full_name, national_id, email, password, employee_number, and department are required'
    });
  }

  if (!['staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Employee role must be staff or admin' });
  }

  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    const [existingUsers] = await conn.query(
      'SELECT id FROM users WHERE national_id = ? OR email = ? LIMIT 1',
      [nationalId, email]
    );

    if (existingUsers.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'National ID or email already exists' });
    }

    const [existingEmployees] = await conn.query(
      'SELECT id FROM employees WHERE employee_number = ? OR email = ? LIMIT 1',
      [employeeNumber, email]
    );

    if (existingEmployees.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Employee number or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await conn.query(
      `INSERT INTO users
        (full_name, national_id, email, password_hash, role, phone, is_confirmed)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [fullName, nationalId, email, passwordHash, role, phone]
    );

    const [employeeResult] = await conn.query(
      `INSERT INTO employees
        (user_id, employee_number, full_name, email, phone, department, role, status, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        userResult.insertId,
        employeeNumber,
        fullName,
        email,
        phone,
        department,
        role,
        hireDate
      ]
    );

    await conn.commit();

    const user = await getSafeUserById(userResult.insertId);

    res.status(201).json({
      message: 'Employee account created',
      user,
      employee: {
        id: employeeResult.insertId,
        user_id: userResult.insertId,
        employee_number: employeeNumber,
        full_name: fullName,
        email,
        phone,
        department,
        role,
        status: 'active',
        hire_date: hireDate
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating admin employee:', err);
    res.status(500).json({ message: 'Failed to create employee account' });
  } finally {
    conn.release();
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT ${transactionSelect}
       FROM transactions
       WHERE transaction_id IS NOT NULL
         AND COALESCE(service_type, transaction_type) IS NOT NULL
       ORDER BY submitted_at DESC, id DESC`
    );

    res.json(transactions);
  } catch (err) {
    console.error('Error fetching admin transactions:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.put('/transactions/:id/assign', async (req, res) => {
  const body = req.body || {};
  const employeeId = Number(body.employee_id || body.assigned_employee_id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return res.status(400).json({ message: 'A valid employee_id is required' });
  }

  try {
    const transaction = await getTransactionById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const [employees] = await db.query(
      `SELECT id, user_id, full_name, email, employee_number, department, role, status
       FROM employees
       WHERE id = ?
         AND role IN ('staff', 'admin')
         AND status = 'active'
       LIMIT 1`,
      [employeeId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ message: 'Active staff employee not found' });
    }

    await db.query(
      `UPDATE transactions
       SET assigned_employee_id = ?, employee_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [employeeId, employeeId, req.params.id]
    );

    const updatedTransaction = await getTransactionById(req.params.id);

    res.json({
      message: 'Transaction assigned',
      transaction: updatedTransaction,
      employee: employees[0]
    });
  } catch (err) {
    console.error('Error assigning admin transaction:', err);
    res.status(500).json({ message: 'Failed to assign transaction' });
  }
});

router.get('/dashboard/summary', async (req, res) => {
  try {
    const [[userCounts]] = await db.query(
      `SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN role IN ('staff', 'admin') THEN 1 ELSE 0 END) AS total_staff
       FROM users`
    );

    const [[transactionCounts]] = await db.query(
      `SELECT COUNT(*) AS total_transactions
       FROM transactions
       WHERE transaction_id IS NOT NULL
         AND COALESCE(service_type, transaction_type) IS NOT NULL`
    );

    const [statusRows] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM transactions
       WHERE transaction_id IS NOT NULL
         AND COALESCE(service_type, transaction_type) IS NOT NULL
       GROUP BY status`
    );

    const transactionsByStatus = statusRows.reduce((acc, row) => {
      acc[row.status] = Number(row.count);
      return acc;
    }, {});

    res.json({
      total_users: Number(userCounts.total_users || 0),
      total_staff: Number(userCounts.total_staff || 0),
      total_transactions: Number(transactionCounts.total_transactions || 0),
      transactions_by_status: transactionsByStatus
    });
  } catch (err) {
    console.error('Error fetching admin dashboard summary:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;

const db = require('../db');

const VALID_STATUSES = new Set([
  'received',
  'in_progress',
  'completed',
  'rejected',
  'transferred'
]);

const ALLOWED_TRANSITIONS = {
  received: new Set(['in_progress', 'rejected', 'transferred']),
  in_progress: new Set(['completed', 'rejected', 'transferred']),
  completed: new Set(),
  rejected: new Set(),
  transferred: new Set()
};

function makeTransactionNumber() {
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TRX-${Date.now()}-${suffix}`;
}

function makeWorkflowError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getUserSummary(userId) {
  if (!userId) return {};

  const [rows] = await db.execute(
    'SELECT id, full_name, national_id FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  return rows[0] || {};
}

async function getEmployeeIdForUser(userId) {
  if (!userId) return null;

  const [rows] = await db.execute(
    'SELECT id FROM employees WHERE user_id = ? LIMIT 1',
    [userId]
  );

  return rows[0]?.id || null;
}

async function createTransaction({
  userId,
  serviceType,
  relatedTable,
  relatedRecordId,
  vehicleId = null,
  amount = null,
  currency = 'ILS',
  paymentMethod = null,
  status = 'received',
  notes = null,
  rejectionReason = null
}) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid transaction status: ${status}`);
  }

  const user = await getUserSummary(userId);
  const transactionNumber = makeTransactionNumber();
  const type = serviceType || 'service_request';

  const [result] = await db.execute(
    `INSERT INTO transactions (
      transaction_id, user_id, vehicle_id, citizen_name, national_id,
      transaction_type, service_type, status, amount, currency, payment_method,
      related_table, related_record_id, notes, rejection_reason, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      transactionNumber,
      userId || null,
      vehicleId,
      user.full_name || null,
      user.national_id || null,
      type,
      type,
      status,
      amount,
      currency || 'ILS',
      paymentMethod,
      relatedTable || null,
      relatedRecordId || null,
      notes,
      rejectionReason
    ]
  );

  return {
    id: result.insertId,
    transaction_id: transactionNumber,
    service_type: type,
    status
  };
}

async function updateTransactionStatus(ids, status, options = {}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Transaction IDs are required');
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid transaction status: ${status}`);
  }

  let assignedEmployeeId = options.assignedEmployeeId || null;
  if (!assignedEmployeeId && options.assignedUserId) {
    assignedEmployeeId = await getEmployeeIdForUser(options.assignedUserId);
  }

  const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const values = [status];

  if (status === 'rejected' && options.rejectionReason) {
    fields.push('rejection_reason = ?');
    values.push(options.rejectionReason);
  }

  if (assignedEmployeeId) {
    fields.push('assigned_employee_id = ?', 'employee_id = ?');
    values.push(assignedEmployeeId, assignedEmployeeId);
  }

  values.push(ids);

  const [result] = await db.query(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id IN (?)`,
    values
  );

  return result;
}

async function getTransactionById(id) {
  const [rows] = await db.query(
    `SELECT
      id,
      transaction_id AS transaction_number,
      transaction_id,
      user_id,
      vehicle_id,
      citizen_name,
      national_id,
      COALESCE(service_type, transaction_type) AS transaction_type,
      service_type,
      status,
      payment_method,
      amount,
      currency,
      rejection_reason,
      transfer_target,
      transfer_note,
      assigned_employee_id,
      employee_id,
      related_table,
      related_record_id,
      notes,
      submitted_at,
      updated_at
    FROM transactions
    WHERE id = ?
      AND transaction_id IS NOT NULL
      AND COALESCE(service_type, transaction_type) IS NOT NULL
    LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function transitionTransaction(id, nextStatus, options = {}) {
  if (!VALID_STATUSES.has(nextStatus)) {
    throw makeWorkflowError(400, `Invalid transaction status: ${nextStatus}`);
  }

  const transaction = await getTransactionById(id);
  if (!transaction) {
    throw makeWorkflowError(404, 'Transaction not found');
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[transaction.status] || new Set();
  if (!allowedNextStatuses.has(nextStatus)) {
    throw makeWorkflowError(
      400,
      `Cannot move transaction from ${transaction.status} to ${nextStatus}`
    );
  }

  let assignedEmployeeId = options.assignedEmployeeId || null;
  if (!assignedEmployeeId && options.assignedUserId) {
    assignedEmployeeId = await getEmployeeIdForUser(options.assignedUserId);
  }

  const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const values = [nextStatus];

  if (nextStatus === 'rejected') {
    fields.push('rejection_reason = ?');
    values.push(options.rejectionReason || null);
  }

  if (nextStatus === 'transferred') {
    fields.push('transfer_target = ?', 'transfer_note = ?');
    values.push(options.transferTarget || null, options.transferNote || null);
  }

  if (assignedEmployeeId) {
    fields.push('assigned_employee_id = ?', 'employee_id = ?');
    values.push(assignedEmployeeId, assignedEmployeeId);
  }

  values.push(id);

  await db.query(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getTransactionById(id);
}

async function getTransactionsByStatus(status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid transaction status: ${status}`);
  }

  const [rows] = await db.query(
    `SELECT
      id,
      transaction_id AS transaction_number,
      transaction_id,
      citizen_name,
      national_id,
      COALESCE(service_type, transaction_type) AS transaction_type,
      service_type,
      status,
      payment_method,
      amount,
      currency,
      rejection_reason,
      transfer_target,
      transfer_note,
      assigned_employee_id,
      employee_id,
      related_table,
      related_record_id,
      submitted_at AS received_date,
      DATE(updated_at) AS date,
      TIME(updated_at) AS time
    FROM transactions
    WHERE status = ?
      AND transaction_id IS NOT NULL
      AND COALESCE(service_type, transaction_type) IS NOT NULL
    ORDER BY submitted_at DESC, id DESC`,
    [status]
  );

  return rows;
}

module.exports = {
  createTransaction,
  updateTransactionStatus,
  getTransactionById,
  transitionTransaction,
  getTransactionsByStatus,
  getEmployeeIdForUser
};

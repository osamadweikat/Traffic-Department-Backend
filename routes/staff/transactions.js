const express = require('express');
const router = express.Router();
const db = require('../../db');
const {
  getTransactionById,
  transitionTransaction
} = require('../../services/transactions');

const allowedRelatedTables = new Set([
  'license_renewals',
  'lost_documents',
  'ownership_transfers',
  'vehicle_registrations',
  'vehicle_renewals',
  'vehicle_conversion_requests',
  'vehicle_deregistrations',
  'vehicle_modifications',
  'vehicle_mortgage_release'
]);

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeRelatedRecord(row) {
  if (!row) return null;

  const clone = { ...row };
  delete clone.password_hash;
  return clone;
}

async function getRelatedRecord(transaction) {
  if (
    !transaction.related_table ||
    !transaction.related_record_id ||
    !allowedRelatedTables.has(transaction.related_table)
  ) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT * FROM \`${transaction.related_table}\` WHERE id = ? LIMIT 1`,
    [transaction.related_record_id]
  );

  return safeRelatedRecord(rows[0]);
}

function handleWorkflowError(res, err) {
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('Staff transaction workflow error:', err);
  return res.status(500).json({ message: 'Failed to process transaction' });
}

router.get('/:id', async (req, res) => {
  try {
    const transaction = await getTransactionById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const related_record = await getRelatedRecord(transaction);

    res.json({
      transaction,
      related_record
    });
  } catch (err) {
    console.error('Error fetching staff transaction detail:', err);
    res.status(500).json({ message: 'Failed to fetch transaction details' });
  }
});

router.put('/:id/in-progress', async (req, res) => {
  try {
    const transaction = await transitionTransaction(req.params.id, 'in_progress', {
      assignedUserId: req.userId
    });

    res.json({
      message: 'Transaction moved to in progress',
      transaction
    });
  } catch (err) {
    return handleWorkflowError(res, err);
  }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const transaction = await transitionTransaction(req.params.id, 'completed', {
      assignedUserId: req.userId
    });

    res.json({
      message: 'Transaction completed',
      transaction
    });
  } catch (err) {
    return handleWorkflowError(res, err);
  }
});

router.put('/:id/reject', async (req, res) => {
  const body = req.body || {};
  const reason = cleanText(body.reason || body.rejection_reason);

  if (!reason) {
    return res.status(400).json({ message: 'Rejection reason is required' });
  }

  try {
    const transaction = await transitionTransaction(req.params.id, 'rejected', {
      assignedUserId: req.userId,
      rejectionReason: reason
    });

    res.json({
      message: 'Transaction rejected',
      transaction
    });
  } catch (err) {
    return handleWorkflowError(res, err);
  }
});

router.put('/:id/transfer', async (req, res) => {
  const body = req.body || {};
  const target = cleanText(body.target || body.transfer_target);
  const note = cleanText(body.note || body.transfer_note);

  if (!target) {
    return res.status(400).json({ message: 'Transfer target is required' });
  }

  try {
    const transaction = await transitionTransaction(req.params.id, 'transferred', {
      assignedUserId: req.userId,
      transferTarget: target,
      transferNote: note || null
    });

    res.json({
      message: 'Transaction transferred',
      transaction
    });
  } catch (err) {
    return handleWorkflowError(res, err);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');

const vehicleSelect = `
  id,
  plate_number,
  COALESCE(vehicle_type, type) AS vehicle_type,
  COALESCE(vehicle_make, brand) AS vehicle_make,
  vehicle_model,
  COALESCE(fuel_type, fuel) AS fuel_type,
  COALESCE(license_expiry, expiry) AS license_expiry,
  color,
  status,
  insurance
`;

const transactionSelect = `
  id,
  transaction_id,
  COALESCE(service_type, transaction_type) AS service_type,
  status,
  amount,
  currency,
  payment_method,
  related_table,
  related_record_id,
  notes,
  rejection_reason,
  submitted_at,
  updated_at
`;

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

function safeRelatedRecord(row) {
  if (!row) return null;

  const clone = { ...row };
  delete clone.password_hash;
  return clone;
}

router.use(requireCitizen);

router.get('/me', (req, res) => {
  res.json({
    id: req.user.id,
    full_name: req.user.full_name,
    national_id: req.user.national_id,
    email: req.user.email,
    role: req.user.role,
    is_confirmed: !!req.user.is_confirmed
  });
});

router.get('/my-vehicles', async (req, res) => {
  try {
    const [vehicles] = await db.query(
      `SELECT ${vehicleSelect}
       FROM vehicles
       WHERE owner_id = ? OR user_id = ?
       ORDER BY id DESC`,
      [req.userId, req.userId]
    );

    res.json(vehicles);
  } catch (err) {
    console.error('Error fetching citizen vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

router.get('/my-transactions', async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT ${transactionSelect}
       FROM transactions
       WHERE user_id = ?
         AND transaction_id IS NOT NULL
         AND COALESCE(service_type, transaction_type) IS NOT NULL
       ORDER BY submitted_at DESC, id DESC`,
      [req.userId]
    );

    res.json(transactions);
  } catch (err) {
    console.error('Error fetching citizen transactions:', err);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
});

router.get('/my-transactions/:id', async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT ${transactionSelect}
       FROM transactions
       WHERE id = ?
         AND user_id = ?
         AND transaction_id IS NOT NULL
       LIMIT 1`,
      [req.params.id, req.userId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const transaction = transactions[0];
    let related_record = null;

    if (
      transaction.related_table &&
      transaction.related_record_id &&
      allowedRelatedTables.has(transaction.related_table)
    ) {
      const [relatedRows] = await db.query(
        `SELECT * FROM \`${transaction.related_table}\` WHERE id = ? LIMIT 1`,
        [transaction.related_record_id]
      );
      related_record = safeRelatedRecord(relatedRows[0]);
    }

    res.json({
      transaction,
      related_record
    });
  } catch (err) {
    console.error('Error fetching citizen transaction detail:', err);
    res.status(500).json({ message: 'Failed to fetch transaction details' });
  }
});

module.exports = router;

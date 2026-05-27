// File: routes/staff/smartSearch.js
const express = require('express');
const router = express.Router();
const db = require('../../db');

const safeUserColumns = `
  id,
  full_name,
  national_id,
  birth_date,
  email,
  created_at,
  phone,
  address,
  role,
  is_confirmed
`;

// POST /api/staff/smart-search
router.post('/smart-search', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Search query is required.' });

  try {
    // 1. Search user by national ID or full name
    const [userResults] = await db.query(
      `SELECT ${safeUserColumns} FROM users WHERE national_id = ? OR full_name = ?`,
      [query, query]
    );

    let vehicleResults = [], transactionResults = [], violationResults = [];

    if (userResults.length > 0) {
      const userId = userResults[0].id;

      [vehicleResults] = await db.query(
        `SELECT * FROM vehicles WHERE owner_id = ?`, [userId]
      );

      [transactionResults] = await db.query(
        `SELECT * FROM transactions WHERE user_id = ?`, [userId]
      );

      [violationResults] = await db.query(
        `SELECT * FROM violations WHERE user_id = ?`, [userId]
      );

      return res.json({
        type: 'user',
        user: userResults[0],
        vehicles: vehicleResults,
        transactions: transactionResults,
        violations: violationResults
      });
    }

    // 2. Search by vehicle plate number
    const [vehicles] = await db.query(
      `SELECT * FROM vehicles WHERE plate_number = ?`, [query]
    );

    if (vehicles.length > 0) {
      const vehicle = vehicles[0];

      [transactionResults] = await db.query(
        `SELECT * FROM transactions WHERE vehicle_id = ?`, [vehicle.id]
      );

      [violationResults] = await db.query(
        `SELECT * FROM violations WHERE vehicle_id = ?`, [vehicle.id]
      );

      return res.json({
        type: 'vehicle',
        vehicle,
        transactions: transactionResults,
        violations: violationResults
      });
    }

    // 3. Search transaction by ID
    const [transactions] = await db.query(
      `SELECT * FROM transactions WHERE transaction_id = ?`, [query]
    );

    if (transactions.length > 0) {
      const transaction = transactions[0];
      let vehicle = null;

      if (transaction.vehicle_id) {
        const [v] = await db.query(
          `SELECT * FROM vehicles WHERE id = ?`, [transaction.vehicle_id]
        );
        vehicle = v[0] || null;
      }

      return res.json({
        type: 'transaction',
        transaction,
        vehicle
      });
    }

    res.json({ type: 'none', message: 'No results found.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;

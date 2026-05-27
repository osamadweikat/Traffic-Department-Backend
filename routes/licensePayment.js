// routes/licensePayment.js
const express = require('express');
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');

const router = express.Router();

// Payment submission route
router.post('/payment/license', requireCitizen, (req, res) => {
  const { license_type, duration, payment_method, total } = req.body;
  const userId = req.userId;

  if (!license_type || !duration || !payment_method || !total) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const sql = `INSERT INTO license_payments (user_id, license_type, duration, payment_method, amount)
               VALUES (?, ?, ?, ?, ?)`;

  db.execute(sql, [userId, license_type, duration, payment_method, total], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Payment failed' });
    }
    res.status(201).json({ message: 'Payment recorded', transaction_id: result.insertId });
  });
});

module.exports = router;

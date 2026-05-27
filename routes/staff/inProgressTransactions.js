// routes/staff/inProgressTransactions.js
const express = require('express');
const router = express.Router();
const { getTransactionsByStatus } = require('../../services/transactions');

// GET all in-progress transactions
router.get('/in-progress-transactions', async (req, res) => {
  try {
    const results = await getTransactionsByStatus('in_progress');
    res.json(results);
  } catch (err) {
    console.error('Error fetching in-progress transactions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

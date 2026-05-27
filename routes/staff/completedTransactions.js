const express = require('express');
const router = express.Router();
const { getTransactionsByStatus } = require('../../services/transactions');

// GET all completed transactions
router.get('/completed-transactions', async (req, res) => {
  try {
    const results = await getTransactionsByStatus('completed');
    res.json(results);
  } catch (err) {
    console.error('Error fetching completed transactions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

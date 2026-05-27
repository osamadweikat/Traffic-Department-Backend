// File: routes/staff/receivedTransactions.js
const express = require('express');
const router = express.Router();
const {
  getTransactionsByStatus,
  updateTransactionStatus
} = require('../../services/transactions');

// GET all received transactions
router.get('/received-transactions', async (req, res) => {
  try {
    const results = await getTransactionsByStatus('received');
    res.json(results);
  } catch (err) {
    console.error('Error retrieving transactions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT to update selected transactions to "in progress"
router.put('/received-transactions/set-in-progress', async (req, res) => {
  const { ids } = req.body; // Array of transaction IDs
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    await updateTransactionStatus(ids, 'in_progress', { assignedUserId: req.userId });
    res.json({ message: 'Transactions updated to in progress' });
  } catch (err) {
    console.error('Error updating transactions:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// PUT to reject selected transactions with reason
router.put('/received-transactions/reject', async (req, res) => {
  const { ids, reason } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !reason) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    await updateTransactionStatus(ids, 'rejected', { rejectionReason: reason });
    res.json({ message: 'Transactions rejected' });
  } catch (err) {
    console.error('Error rejecting transactions:', err);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

module.exports = router;

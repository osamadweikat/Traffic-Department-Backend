const express = require('express');
const fs = require('fs');
const router = express.Router();
const {
  getDocumentForAccess,
  getTransactionDocuments,
  resolveStoredDocumentPath
} = require('../services/uploadSecurity');
const db = require('../db');

function isStaffOrAdmin(user) {
  return user.role === 'staff' || user.role === 'admin';
}

router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const [transactions] = await db.query(
      `SELECT id, user_id
       FROM transactions
       WHERE id = ?
         AND transaction_id IS NOT NULL
       LIMIT 1`,
      [req.params.transactionId]
    );

    const transaction = transactions[0];
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (!isStaffOrAdmin(req.user) && transaction.user_id !== req.userId) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const documents = await getTransactionDocuments(req.params.transactionId);
    res.json(documents);
  } catch (err) {
    console.error('Error fetching transaction documents:', err);
    res.status(500).json({ message: 'Failed to fetch transaction documents' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const document = await getDocumentForAccess(req.params.id, req.user);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const absolutePath = resolveStoredDocumentPath(document.file_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: 'Document file not found' });
    }

    res.type(document.mime_type || 'application/octet-stream');
    res.download(absolutePath, document.original_name || document.file_name);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error('Error downloading document:', err);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

module.exports = router;

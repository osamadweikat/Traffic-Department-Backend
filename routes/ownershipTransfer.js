const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');
const { createTransaction } = require('../services/transactions');
const {
  createUpload,
  handleUpload,
  saveTransactionDocuments,
  findTransactionForRelatedRecord
} = require('../services/uploadSecurity');

const upload = createUpload('ownership_docs');

// Step 1: Submit form
router.post('/ownership/form', requireCitizen, (req, res) => {
  const { ownerId, ownerName, vehicleType, fuelType } = req.body;

  const query = `INSERT INTO ownership_transfers (owner_id, owner_name, vehicle_type, fuel_type)
                 VALUES (?, ?, ?, ?)`;
  db.query(query, [ownerId, ownerName, vehicleType, fuelType], async (err, result) => {
    if (err) return res.status(500).json({ message: 'Error inserting form data', error: err });

    try {
      const transaction = await createTransaction({
        userId: req.userId,
        serviceType: 'ownership_transfer',
        relatedTable: 'ownership_transfers',
        relatedRecordId: result.insertId,
        notes: `${vehicleType || ''}:${fuelType || ''}`
      });

      res.json({
        message: 'Form submitted',
        transferId: result.insertId,
        transaction_id: transaction.transaction_id,
        transaction
      });
    } catch (transactionErr) {
      console.error('Transaction creation error:', transactionErr);
      res.status(500).json({ message: 'Form saved but transaction creation failed' });
    }
  });
});

// Step 2: Upload documents
router.post('/ownership/upload/:transferId', requireCitizen, handleUpload(upload.any()), async (req, res) => {
  const transferId = req.params.transferId;

  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: 'No documents uploaded' });

  try {
    const transaction = await findTransactionForRelatedRecord(
      'ownership_transfers',
      transferId,
      req.userId
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found for this transfer' });
    }

    const inserts = req.files.map(file => [
      transferId,
      file.fieldname,
      file.path
    ]);

    await db.query(
      'INSERT INTO ownership_documents (transfer_id, document_type, file_path) VALUES ?',
      [inserts]
    );

    const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

    res.json({
      message: 'Documents uploaded successfully',
      transaction_id: transaction.transaction_id,
      documents
    });
  } catch (err) {
    console.error('Ownership document upload error:', err);
    res.status(500).json({ message: 'Upload error' });
  }
});

// Step 3: Save payment
router.post('/ownership/payment', requireCitizen, (req, res) => {
  const { transferId, totalAmount, currency } = req.body;

  db.query(
    'INSERT INTO ownership_payments (transfer_id, total_amount, currency) VALUES (?, ?, ?)',
    [transferId, totalAmount, currency || 'ILS'],
    (err) => {
      if (err) return res.status(500).json({ message: 'Payment error', error: err });
      res.json({ message: 'Payment recorded' });
    }
  );
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');
const { createTransaction } = require('../services/transactions');
const {
  createUpload,
  handleUpload,
  saveTransactionDocuments
} = require('../services/uploadSecurity');

const upload = createUpload('vehicle_deregistrations');

router.post(
  '/vehicle-deregistration',
  requireCitizen,
  handleUpload(upload.fields([
    { name: 'license_copy', maxCount: 1 },
    { name: 'plate_photo', maxCount: 1 },
    { name: 'payment_proof', maxCount: 1 }
  ])),
  (req, res) => {
    const { owner_name, national_id, vehicle_type, deregistration_reason } = req.body;
    const license_copy = req.files['license_copy']?.[0]?.filename || null;
    const plate_photo = req.files['plate_photo']?.[0]?.filename || null;
    const payment_proof = req.files['payment_proof']?.[0]?.filename || null;

    const sql = `INSERT INTO vehicle_deregistrations 
    (owner_name, national_id, vehicle_type, deregistration_reason, license_copy, plate_photo, payment_proof) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [owner_name, national_id, vehicle_type, deregistration_reason, license_copy, plate_photo, payment_proof], async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      try {
        const transaction = await createTransaction({
          userId: req.userId,
          serviceType: 'vehicle_deregistration',
          relatedTable: 'vehicle_deregistrations',
          relatedRecordId: result.insertId,
          notes: deregistration_reason || null
        });
        const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

        res.status(201).json({
          message: 'Deregistration request saved',
          id: result.insertId,
          transaction_id: transaction.transaction_id,
          transaction,
          documents
        });
      } catch (transactionErr) {
        console.error('Transaction creation error:', transactionErr);
        res.status(500).json({ message: 'Deregistration saved but transaction creation failed' });
      }
    });
  }
);

module.exports = router;

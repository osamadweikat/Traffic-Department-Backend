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

const upload = createUpload('vehicle_modifications');

router.post(
  '/vehicle-modification',
  requireCitizen,
  handleUpload(upload.fields([
    { name: 'ownership_document', maxCount: 1 },
    { name: 'modification_certificate', maxCount: 1 },
    { name: 'payment_proof', maxCount: 1 }
  ])),
  (req, res) => {
    const {
      owner_name,
      national_id,
      vehicle_type,
      modification_type,
      description
    } = req.body;

    const ownershipDocument = req.files['ownership_document']?.[0]?.filename || null;
    const modificationCertificate = req.files['modification_certificate']?.[0]?.filename || null;
    const paymentProof = req.files['payment_proof']?.[0]?.filename || null;

    const sql = `INSERT INTO vehicle_modifications
      (owner_name, national_id, vehicle_type, modification_type, description,
       ownership_document, modification_certificate, payment_proof)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
      owner_name,
      national_id,
      vehicle_type,
      modification_type,
      description,
      ownershipDocument,
      modificationCertificate,
      paymentProof
    ];

    db.query(sql, values, async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      try {
        const transaction = await createTransaction({
          userId: req.userId,
          serviceType: 'vehicle_modification',
          relatedTable: 'vehicle_modifications',
          relatedRecordId: result.insertId,
          notes: modification_type || null
        });
        const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

        res.status(201).json({
          message: 'Vehicle modification request submitted',
          id: result.insertId,
          transaction_id: transaction.transaction_id,
          transaction,
          documents
        });
      } catch (transactionErr) {
        console.error('Transaction creation error:', transactionErr);
        res.status(500).json({ message: 'Modification saved but transaction creation failed' });
      }
    });
  }
);

module.exports = router;

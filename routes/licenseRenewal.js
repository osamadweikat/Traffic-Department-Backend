const express = require('express');
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');
const { createTransaction } = require('../services/transactions');
const {
  createUpload,
  handleUpload,
  saveTransactionDocuments
} = require('../services/uploadSecurity');

const router = express.Router();

const upload = createUpload('license_renewals');

// Fields required
const requiredFields = [
  'original_license',
  'personal_id_card',
  'personal_photo',
  'medical_check',
  'fines_clearance'
];

// Upload + Save to DB route
router.post(
  '/upload-license-renewal',
  requireCitizen,
  handleUpload(upload.fields(requiredFields.map(name => ({ name, maxCount: 1 })))),
  (req, res) => {
    const files = req.files;
    const userId = req.userId;

    const missing = requiredFields.filter(field => !files || !files[field]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing files: ${missing.join(', ')}` });
    }

    const data = {
      user_id: userId,
      original_license: files['original_license'][0].filename,
      personal_id_card: files['personal_id_card'][0].filename,
      personal_photo: files['personal_photo'][0].filename,
      medical_check: files['medical_check'][0].filename,
      fines_clearance: files['fines_clearance'][0].filename
    };

    const sql = `
      INSERT INTO license_renewals (
        user_id, original_license, personal_id_card, personal_photo,
        medical_check, fines_clearance
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.user_id,
      data.original_license,
      data.personal_id_card,
      data.personal_photo,
      data.medical_check,
      data.fines_clearance
    ];

    db.query(sql, values, async (err, result) => {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ message: 'Failed to store renewal data' });
      }

      try {
        const transaction = await createTransaction({
          userId,
          serviceType: 'license_renewal',
          relatedTable: 'license_renewals',
          relatedRecordId: result.insertId
        });
        const documents = await saveTransactionDocuments(transaction.id, files, req.userId);

        res.status(200).json({
          message: 'License renewal submitted successfully',
          request_id: result.insertId,
          transaction_id: transaction.transaction_id,
          transaction,
          documents
        });
      } catch (transactionErr) {
        console.error('Transaction creation error:', transactionErr);
        res.status(500).json({ message: 'Renewal saved but transaction creation failed' });
      }
    });
  }
);

module.exports = router;

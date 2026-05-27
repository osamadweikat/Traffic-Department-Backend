// routes/vehicleMortgageRelease.js
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

const upload = createUpload('mortgage');

router.post('/vehicle-mortgage-release', requireCitizen, handleUpload(upload.fields([
  { name: 'mortgageDocument', maxCount: 1 },
  { name: 'ownershipProof', maxCount: 1 },
])), async (req, res) => {
  const {
    owner_name,
    national_id,
    vehicle_model,
    plate_number,
    release_date,
    isRelease
  } = req.body;

  try {
    const mortgageDocument = req.files['mortgageDocument']?.[0]?.path || null;
    const ownershipProof = req.files['ownershipProof']?.[0]?.path || null;

    const [result] = await db.query(
      `INSERT INTO vehicle_mortgage_release (
        owner_name, national_id, vehicle_model, plate_number,
        release_date, is_release, mortgage_document, ownership_proof
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        owner_name,
        national_id,
        vehicle_model,
        plate_number,
        release_date,
        isRelease === 'true',
        mortgageDocument,
        ownershipProof
      ]
    );

    const transaction = await createTransaction({
      userId: req.userId,
      serviceType: 'vehicle_mortgage_release',
      relatedTable: 'vehicle_mortgage_release',
      relatedRecordId: result.insertId,
      notes: plate_number || null
    });
    const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

    res.status(201).json({
      message: 'Mortgage release submitted successfully.',
      request_id: result.insertId,
      transaction_id: transaction.transaction_id,
      transaction,
      documents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insertion failed.' });
  }
});

module.exports = router;

// routes/vehicleRegistration.js
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

const upload = createUpload('vehicle_registration');

router.post('/vehicle-registration', requireCitizen, handleUpload(upload.fields([
  { name: 'ownership_proof', maxCount: 1 },
  { name: 'insurance_document', maxCount: 1 },
  { name: 'technical_report', maxCount: 1 }
])), async (req, res) => {
  try {
    const data = req.body;
    const files = req.files;

    const query = `INSERT INTO vehicle_registrations (
      owner_name, national_id, vehicle_type, vehicle_make,
      ownership_proof, insurance_document, technical_report
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.execute(query, [
      data.owner_name,
      data.national_id,
      data.vehicle_type,
      data.vehicle_make,
      files.ownership_proof?.[0]?.path,
      files.insurance_document?.[0]?.path,
      files.technical_report?.[0]?.path
    ]);

    const transaction = await createTransaction({
      userId: req.userId,
      serviceType: 'vehicle_registration',
      relatedTable: 'vehicle_registrations',
      relatedRecordId: result.insertId
    });
    const documents = await saveTransactionDocuments(transaction.id, files, req.userId);

    res.status(201).json({
      message: 'Vehicle registration submitted successfully.',
      request_id: result.insertId,
      transaction_id: transaction.transaction_id,
      transaction,
      documents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

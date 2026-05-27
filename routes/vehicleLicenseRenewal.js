// routes/vehicleLicenseRenewal.js
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

const upload = createUpload('vehicle_renewal');

// POST route to handle vehicle license renewal request
router.post('/renew-license', requireCitizen, handleUpload(upload.fields([
  { name: 'ownershipProof' },
  { name: 'insuranceDocument' },
  { name: 'technicalInspection' }
])), (req, res) => {
  const {
    ownerName,
    nationalId,
    vehicleType,
    vehicleModel,
    plateNumber,
    licenseExpiry
  } = req.body;

  const ownershipProof = req.files['ownershipProof']?.[0]?.filename || '';
  const insuranceDocument = req.files['insuranceDocument']?.[0]?.filename || '';
  const technicalInspection = req.files['technicalInspection']?.[0]?.filename || '';

  const sql = `INSERT INTO vehicle_renewals 
    (owner_name, national_id, vehicle_type, vehicle_model, plate_number, license_expiry, ownership_proof, insurance_document, technical_inspection) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    ownerName,
    nationalId,
    vehicleType,
    vehicleModel,
    plateNumber,
    licenseExpiry,
    ownershipProof,
    insuranceDocument,
    technicalInspection
  ];

  db.query(sql, values, async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    try {
      const transaction = await createTransaction({
        userId: req.userId,
        serviceType: 'vehicle_license_renewal',
        relatedTable: 'vehicle_renewals',
        relatedRecordId: result.insertId,
        notes: plateNumber || null
      });
      const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

      res.status(201).json({
        success: true,
        message: 'Renewal request submitted successfully.',
        request_id: result.insertId,
        transaction_id: transaction.transaction_id,
        transaction,
        documents
      });
    } catch (transactionErr) {
      console.error('Transaction creation error:', transactionErr);
      res.status(500).json({ success: false, message: 'Renewal saved but transaction creation failed' });
    }
  });
});

module.exports = router;

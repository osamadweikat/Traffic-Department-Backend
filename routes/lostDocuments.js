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

const upload = createUpload('lost_documents');

// Upload documents API
router.post('/upload-lost-documents/:requestId', requireCitizen, handleUpload(upload.any()), async (req, res) => {
  const requestId = req.params.requestId;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const transaction = await findTransactionForRelatedRecord(
      'lost_documents',
      requestId,
      req.userId
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found for this request' });
    }

    for (const file of req.files) {
      const insertFileQuery = `
        INSERT INTO lost_document_files (request_id, file_name, file_path, field_name)
        VALUES (?, ?, ?, ?)
      `;

      await db.query(insertFileQuery, [
        requestId,
        file.filename,
        file.path,
        file.fieldname || 'unknown'
      ]);
    }

    const documents = await saveTransactionDocuments(transaction.id, req.files, req.userId);

    res.status(200).json({
      message: 'Files uploaded and saved to database successfully',
      transaction_id: transaction.transaction_id,
      documents
    });
  } catch (err) {
    console.error('Error saving files to database:', err);
    res.status(500).json({ message: 'Error saving files to database' });
  }
});

// Submit lost document form API
router.post('/submit-lost-document', requireCitizen, (req, res) => {
  const { ownerId, ownerName, plateNumber, documentType, replacementType } = req.body;

  if (!ownerId || !ownerName || !documentType || !replacementType) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const checkUserQuery = 'SELECT id FROM users WHERE national_id = ? AND full_name = ?';
  db.query(checkUserQuery, [ownerId, ownerName], (err, results) => {
    if (err) {
      console.error('Database error during user check:', err);
      return res.status(500).json({ message: 'Server error during user validation' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found or data does not match' });
    }

    const insertQuery = `
      INSERT INTO lost_documents (owner_id, owner_name, plate_number, document_type, replacement_type)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [ownerId, ownerName, plateNumber || null, documentType, replacementType],
      async (err, result) => {
        if (err) {
          console.error('Database error during insertion:', err);
          return res.status(500).json({ message: 'Server error while saving data' });
        }

        try {
          const transaction = await createTransaction({
            userId: req.userId,
            serviceType: 'lost_document',
            relatedTable: 'lost_documents',
            relatedRecordId: result.insertId,
            notes: `${documentType}:${replacementType}`
          });

          res.status(201).json({
            message: 'Lost document request submitted successfully',
            requestId: result.insertId,
            transaction_id: transaction.transaction_id,
            transaction
          });
        } catch (transactionErr) {
          console.error('Transaction creation error:', transactionErr);
          res.status(500).json({ message: 'Request saved but transaction creation failed' });
        }
      }
    );
  });
});

module.exports = router;

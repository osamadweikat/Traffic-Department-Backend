const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024);

const allowedMimeTypes = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png']
]);

function isInsideUploadRoot(targetPath) {
  const relative = path.relative(UPLOAD_ROOT, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function ensureUploadDir(subdir = '') {
  const targetDir = path.resolve(UPLOAD_ROOT, subdir);

  if (!isInsideUploadRoot(targetDir)) {
    throw new Error('Invalid upload directory');
  }

  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function getSafeExtension(file) {
  const mimeExtension = allowedMimeTypes.get(file.mimetype);
  const originalExtension = path.extname(file.originalname || '').toLowerCase();

  if (mimeExtension && originalExtension === '.jpeg') {
    return '.jpeg';
  }

  return mimeExtension;
}

function createUpload(subdir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        cb(null, ensureUploadDir(subdir));
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => {
      const extension = getSafeExtension(file);
      cb(null, `${file.fieldname}-${crypto.randomUUID()}${extension}`);
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 10
    },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase();

      if (!allowedMimeTypes.has(file.mimetype)) {
        const err = new Error('Only PDF, JPG/JPEG, and PNG files are allowed');
        err.statusCode = 400;
        return cb(err);
      }

      if (!['.pdf', '.jpg', '.jpeg', '.png'].includes(extension)) {
        const err = new Error('File extension must be PDF, JPG/JPEG, or PNG');
        err.statusCode = 400;
        return cb(err);
      }

      return cb(null, true);
    }
  });
}

function handleUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: `File is too large. Maximum size is ${MAX_FILE_SIZE} bytes`
        });
      }

      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
      }

      return res.status(err.statusCode || 400).json({
        message: err.message || 'Invalid upload'
      });
    });
  };
}

function normalizeFiles(files) {
  if (!files) return [];
  if (Array.isArray(files)) return files;

  return Object.values(files).flat();
}

function getRelativeUploadPath(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!isInsideUploadRoot(absolutePath)) {
    throw new Error('Uploaded file path is outside the upload root');
  }

  return path.relative(UPLOAD_ROOT, absolutePath).replace(/\\/g, '/');
}

async function saveTransactionDocuments(transactionId, files, uploadedBy) {
  const normalizedFiles = normalizeFiles(files);

  if (!transactionId || normalizedFiles.length === 0) {
    return [];
  }

  for (const file of normalizedFiles) {
    const relativePath = getRelativeUploadPath(file.path);

    await db.query(
      `INSERT INTO transaction_documents (
        transaction_id,
        document_type,
        field_name,
        file_name,
        file_path,
        original_name,
        stored_name,
        mime_type,
        file_size,
        uploaded_by,
        uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        document_type = VALUES(document_type),
        file_name = VALUES(file_name),
        file_path = VALUES(file_path),
        original_name = VALUES(original_name),
        stored_name = VALUES(stored_name),
        mime_type = VALUES(mime_type),
        file_size = VALUES(file_size),
        uploaded_by = VALUES(uploaded_by),
        uploaded_at = CURRENT_TIMESTAMP`,
      [
        transactionId,
        file.fieldname || 'document',
        file.fieldname || 'document',
        file.filename,
        relativePath,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        uploadedBy || null
      ]
    );
  }

  return getTransactionDocuments(transactionId);
}

async function findTransactionForRelatedRecord(relatedTable, relatedRecordId, userId = null) {
  const values = [relatedTable, relatedRecordId];
  let userFilter = '';

  if (userId) {
    userFilter = ' AND user_id = ?';
    values.push(userId);
  }

  const [rows] = await db.query(
    `SELECT id, user_id, transaction_id, service_type, status
     FROM transactions
     WHERE related_table = ?
       AND related_record_id = ?
       ${userFilter}
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function getTransactionDocuments(transactionId) {
  const [rows] = await db.query(
    `SELECT
      id,
      transaction_id,
      document_type,
      field_name,
      original_name,
      stored_name,
      mime_type,
      file_size,
      validation_status,
      uploaded_by,
      uploaded_at
     FROM transaction_documents
     WHERE transaction_id = ?
     ORDER BY uploaded_at DESC, id DESC`,
    [transactionId]
  );

  return rows;
}

async function getDocumentForAccess(documentId, user) {
  const [rows] = await db.query(
    `SELECT
      d.id,
      d.transaction_id,
      d.document_type,
      d.field_name,
      d.file_name,
      d.file_path,
      d.original_name,
      d.mime_type,
      d.file_size,
      d.validation_status,
      d.uploaded_by,
      d.uploaded_at,
      t.user_id
     FROM transaction_documents d
     JOIN transactions t ON t.id = d.transaction_id
     WHERE d.id = ?
     LIMIT 1`,
    [documentId]
  );

  const document = rows[0] || null;
  if (!document) return null;

  if (user.role === 'citizen' && document.user_id !== user.id) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }

  return document;
}

function resolveStoredDocumentPath(relativePath) {
  const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);

  if (!isInsideUploadRoot(absolutePath)) {
    const err = new Error('Invalid document path');
    err.statusCode = 400;
    throw err;
  }

  return absolutePath;
}

module.exports = {
  UPLOAD_ROOT,
  MAX_FILE_SIZE,
  createUpload,
  handleUpload,
  saveTransactionDocuments,
  findTransactionForRelatedRecord,
  getTransactionDocuments,
  getDocumentForAccess,
  resolveStoredDocumentPath
};

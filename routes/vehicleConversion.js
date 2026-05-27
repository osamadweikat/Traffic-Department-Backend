// routes/vehicleConversion.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireCitizen } = require('../middleware/auth');
const { createTransaction } = require('../services/transactions');

// Submit a vehicle conversion request
router.post('/vehicle-conversion', requireCitizen, async (req, res) => {
  const {
    owner_id,
    owner_name,
    vehicle_type,
    current_status,
    conversion_type,
    reason,
    total_amount,
    currency,
    documents
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO vehicle_conversion_requests 
       (owner_id, owner_name, vehicle_type, current_status, conversion_type, reason, total_amount, currency, documents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        owner_id,
        owner_name,
        vehicle_type,
        current_status,
        conversion_type,
        reason,
        total_amount,
        currency,
        JSON.stringify(documents)
      ]
    );

    const transaction = await createTransaction({
      userId: req.userId,
      serviceType: 'vehicle_conversion',
      relatedTable: 'vehicle_conversion_requests',
      relatedRecordId: result.insertId,
      amount: total_amount || null,
      currency: currency || 'ILS',
      notes: conversion_type || null
    });

    res.status(201).json({
      success: true,
      id: result.insertId,
      transaction_id: transaction.transaction_id,
      transaction
    });
  } catch (err) {
    console.error('Error submitting vehicle conversion:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

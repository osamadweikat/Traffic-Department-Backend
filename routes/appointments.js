const express = require('express');
const router = express.Router();
const db = require('../db');

// POST: Book an appointment
router.post('/book-appointment', (req, res) => {
  const { city, branch, date, time } = req.body;

  if (!city || !branch || !date || !time) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const qrData = `${city} - ${branch} | ${date} | ${time}`;

  const query = `
    INSERT INTO appointments (city, branch, appointment_date, appointment_time, qr_data)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [city, branch, date, time, qrData], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointmentId: result.insertId,
      qr_data: qrData
    });
  });
});

module.exports = router;

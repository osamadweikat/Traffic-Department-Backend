// backend/routes/vehicles.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all vehicles
router.get('/vehicles', (req, res) => {
  const query = 'SELECT * FROM vehicles';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching vehicles:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

module.exports = router;

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';

// POST /login
router.post('/login', (req, res) => {
  const { national_id, password } = req.body;
  const secretKey = process.env.JWT_SECRET;

  if (!secretKey) {
    return res.status(500).json({ message: 'Authentication is not configured' });
  }

  if (!national_id || !password) {
    return res.status(400).json({ message: 'National ID and password are required' });
  }

  const sql = 'SELECT id, full_name, national_id, email, password_hash, role, is_confirmed FROM users WHERE national_id = ?';
  db.query(sql, [national_id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid national ID or password' });
    }

    const user = results[0];

    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid national ID or password' });
      }

      const safeUser = {
        id: user.id,
        full_name: user.full_name,
        national_id: user.national_id,
        email: user.email,
        role: user.role || 'citizen'
      };

      const token = jwt.sign(
        {
          sub: user.id,
          userId: user.id,
          role: safeUser.role
        },
        secretKey,
        { expiresIn: jwtExpiresIn }
      );

      res.status(200).json({ message: 'Login successful', token, user: safeUser });
    });
  });
});

module.exports = router;

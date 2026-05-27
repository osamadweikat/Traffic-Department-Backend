const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// POST /register
router.post('/register', async (req, res) => {
  const {
    full_name,
    national_id,
    birth_date,
    email,
    password
  } = req.body;

  if (!full_name || !national_id || !birth_date || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE national_id = ? OR email = ?',
      [national_id, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'National ID or email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users
        (full_name, national_id, birth_date, email, password_hash, role, is_confirmed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [full_name, national_id, birth_date, email, hashedPassword, 'citizen', 0]
    );

    res.status(201).json({
      message: 'User registered successfully!',
      userId: result.insertId,
      user: {
        id: result.insertId,
        full_name,
        national_id,
        email,
        role: 'citizen'
      }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;

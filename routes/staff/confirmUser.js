// File: routes/staff/confirmUser.js

const express = require('express');
const router = express.Router();
const db = require('../../db'); // Assumes your DB connection is in db.js

const safeUserColumns = `
  id,
  full_name,
  national_id,
  birth_date,
  email,
  created_at,
  phone,
  address,
  role,
  is_confirmed
`;

// GET /api/staff/users - get all users
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(`SELECT ${safeUserColumns} FROM users`);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/staff/users/search - search by full_name or national_id
router.post('/users/search', async (req, res) => {
  const { query } = req.body;
  try {
    const [rows] = await db.execute(
      `SELECT ${safeUserColumns} FROM users WHERE full_name = ? OR national_id = ? LIMIT 1`,
      [query, query]
    );
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/users/confirm/:id
router.put('/users/confirm/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    await db.execute('UPDATE users SET is_confirmed = 1 WHERE id = ?', [userId]);
    res.json({ message: 'User confirmed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/staff/users/reject/:id
router.put('/users/reject/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    await db.execute('UPDATE users SET is_confirmed = 0 WHERE id = ?', [userId]);
    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

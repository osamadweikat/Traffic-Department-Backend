// 📁 File: routes/staff/messages.js
const express = require('express');
const router = express.Router();
const db = require('../../db');
// GET all messages
router.get('/', async (req, res) => {
  try {
    const [messages] = await db.query('SELECT * FROM messages ORDER BY date DESC');
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST a new message
router.post('/', async (req, res) => {
  const { subject, from, date } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO messages (subject, `from`, date) VALUES (?, ?, ?)',
      [subject, from, date]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE a message by ID
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM messages WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;

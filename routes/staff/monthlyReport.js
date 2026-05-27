// routes/staff/monthlyReport.js
const express = require('express');
const router = express.Router();
const db = require('../../db');

// Sample structure for report response.
router.get('/monthly-report', async (req, res) => {
  try {
    const [employeeRows] = await db.query('SELECT * FROM employees WHERE id = ?', [1]);
    const [detailsRows] = await db.query('SELECT * FROM employee_details WHERE employee_id = ?', [1]);
    const [transactions] = await db.query('SELECT type, count FROM transaction_distribution WHERE employee_id = ?', [1]);
    const [evaluationRows] = await db.query('SELECT * FROM evaluations WHERE employee_id = ?', [1]);
    const [reportRows] = await db.query('SELECT * FROM reports WHERE employee_id = ?', [1]);

    res.json({
      employee: employeeRows[0],
      achievement_details: detailsRows[0],
      transaction_distribution: transactions.reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {}),
      evaluation: evaluationRows[0],
      report: reportRows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error retrieving monthly report' });
  }
});

module.exports = router;

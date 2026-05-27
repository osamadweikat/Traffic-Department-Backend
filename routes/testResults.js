const express = require('express');
const router = express.Router();
const db = require('../db');

// Get test results by national ID
router.get('/test-results/:nationalId', (req, res) => {
  const nationalId = req.params.nationalId;

  const theoreticalQuery = 'SELECT * FROM theoretical_results WHERE national_id = ? LIMIT 1';
  const practicalQuery = 'SELECT * FROM practical_results WHERE national_id = ? LIMIT 1';

  db.query(theoreticalQuery, [nationalId], (err, theoreticalResults) => {
    if (err) return res.status(500).json({ message: 'Error fetching theoretical results' });

    db.query(practicalQuery, [nationalId], (err2, practicalResults) => {
      if (err2) return res.status(500).json({ message: 'Error fetching practical results' });

      if (theoreticalResults.length === 0 && practicalResults.length === 0) {
        return res.status(404).json({ message: 'No results found for this national ID' });
      }

      let theoretical = null;
      if (theoreticalResults.length > 0) {
        const t = theoreticalResults[0];
        const examScore = t.score;
        const passMark = t.pass_mark;
        theoretical = {
          id: t.id,
          national_id: t.national_id,
          name: t.name,
          exam_date: t.exam_date,
          license_grade: t.license_grade,
          max_score: t.max_score,
          exam_score: examScore,
          needs_examiner: !!t.needs_examiner,
          passMark: passMark,
          question_count: t.question_count,
          final_result: examScore >= passMark ? 'passed' : 'failed'
        };
      }

      let practical = null;
      if (practicalResults.length > 0) {
        const p = practicalResults[0];
        practical = {
          id: p.id,
          national_id: p.national_id,
          name: p.name,
          exam_date: p.exam_date,
          license_grade: p.license_grade,
          final_result: p.score_status,
          school_name: p.school_name
        };
      }

      res.json({ theoretical, practical });
    });
  });
});

module.exports = router;

// routes/trafficViolations.js
const express = require('express');
const router = express.Router();

// Sample hardcoded violations, replace with DB query if needed
const violations = [
  {
    type: 'license',
    id: '123456789',
    violations: [
      {
        violation: 'Speeding',
        date: '2025-06-01',
        amount: 400,
        officer: 'Officer Ali',
        location: 'Main Street',
        notes: 'Exceeded speed limit'
      }
    ]
  },
  {
    type: 'vehicle',
    plateNumber: 'NABLUS123',
    violations: [
      {
        violation: 'Illegal parking',
        date: '2025-05-15',
        amount: 200,
        officer: 'Officer Sara',
        location: '2nd Avenue',
        notes: 'Parked on sidewalk'
      }
    ]
  }
];

router.get('/violations/search', (req, res) => {
  const { type, reference } = req.query;

  if (!type || !reference)
    return res.status(400).json({ message: 'Missing type or reference' });

  let matched = violations.find((v) => {
    return type === 'license'
      ? v.type === 'license' && v.id === reference
      : v.type === 'vehicle' && v.plateNumber === reference;
  });

  if (!matched) return res.status(404).json({ message: 'No violations found' });

  res.json(matched);
});

module.exports = router;

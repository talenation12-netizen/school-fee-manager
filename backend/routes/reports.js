const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/dashboard', auth, async (req, res) => {
  try {
    // Placeholder values for initial frontend testing
    res.json({
      totalStudents: 1200,
      totalCollected: 450000,
      totalOutstanding: 120000,
      transactions: 3400,
      avgPayment: 1323
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard'
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');

// @route   GET /api/anomalies
// @desc    Get all anomalies
// @access  Public
router.get('/', async (req, res) => {
    try {
        const anomalies = await Anomaly.find();
        res.json(anomalies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/anomalies
// @desc    Create an anomaly
// @access  Public
router.post('/', async (req, res) => {
    try {
        const newAnomaly = new Anomaly(req.body);
        const anomaly = await newAnomaly.save();
        res.json(anomaly);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;

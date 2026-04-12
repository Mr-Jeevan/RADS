const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');

// @route   POST api/anomalies
// @desc    Receive anomaly data from IoT sensor or Frontend
router.post('/', async (req, res) => {
    // 1. Log the incoming data to the terminal
    console.log("📥 [IoT Data Received]:", JSON.stringify(req.body, null, 2));

    try {
        const { type, severity, gForce, location } = req.body;

        // 2. Simple validation check
        if (!type || !location) {
            console.error("⚠️ [Validation Failed]: Missing type or location");
            return res.status(400).json({ msg: 'Please include all fields' });
        }

        const newAnomaly = new Anomaly({
            type,
            severity,
            gForce,
            location
        });

        const anomaly = await newAnomaly.save();
        
        // 3. Log success
        console.log("✅ [Database]: Saved successfully with ID:", anomaly._id);
        res.status(201).json(anomaly);

    } catch (err) {
        // 4. Log the specific error for debugging
        console.error("❌ [Server Error]:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/anomalies
// @desc    Get all anomalies for the map
router.get('/', async (req, res) => {
    try {
        const anomalies = await Anomaly.find().sort({ reportedAt: -1 });
        res.json(anomalies);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
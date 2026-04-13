const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');

// POST
router.post('/', async (req, res) => {

    try {
        const { type, severity, gForce, location } = req.body;

        if (!type || !location || !location.coordinates) {
            return res.status(400).json({ msg: 'Invalid data' });
        }

        // 🔥 Duplicate prevention (10 meters)
        const existing = await Anomaly.findOne({
            type,
            location: {
                $near: {
                    $geometry: location,
                    $maxDistance: 10
                }
            }
        });

        if (existing) {
            return res.status(200).json({ msg: 'Duplicate ignored' });
        }

        const newAnomaly = new Anomaly({
            type,
            severity,
            gForce,
            location
        });

        const saved = await newAnomaly.save();

        console.log("✅ Saved:", saved._id);

        res.status(201).json(saved);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET
router.get('/', async (req, res) => {
    try {
        const anomalies = await Anomaly.find().sort({ reportedAt: -1 });
        res.json(anomalies);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
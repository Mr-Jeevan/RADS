const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Anomaly = require('./models/Anomaly');

dotenv.config();

// Tiruchirappalli coordinates
const TRICHY_LAT = 10.7905;
const TRICHY_LNG = 78.7047;

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB Connected for Seeding...'))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

const generateRandomCoordinates = () => {
    // Generate random coordinates within ~5-10km radius of Trichy
    // 0.1 degree is roughly 11km
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;
    return [TRICHY_LNG + lngOffset, TRICHY_LAT + latOffset];
};

const generateAnomalies = async () => {
    try {
        await Anomaly.deleteMany();
        console.log('Cleared existing anomalies...');

        const anomalies = [];

        for (let i = 0; i < 50; i++) {
            const isPothole = Math.random() < 0.7; // 70% potholes
            const type = isPothole ? 'pothole' : 'speedbreaker';

            let gForce, severity;

            if (isPothole) {
                // Pothole: -0.5g to -2.0g
                gForce = -0.5 - (Math.random() * 1.5);
                if (gForce > -1.0) severity = 'low';
                else if (gForce > -1.5) severity = 'medium';
                else severity = 'high';
            } else {
                // Speedbreaker: +1.0g to +2.5g
                gForce = 1.0 + (Math.random() * 1.5);
                if (gForce < 1.5) severity = 'low';
                else if (gForce < 2.0) severity = 'medium';
                else severity = 'high';
            }

            // Occasional critical severity
            if (Math.random() < 0.1) severity = 'critical';

            anomalies.push({
                type,
                severity,
                gForce: parseFloat(gForce.toFixed(2)),
                description: `Detected ${type} with ${gForce.toFixed(2)}g impact.`,
                location: {
                    type: 'Point',
                    coordinates: generateRandomCoordinates()
                },
                reportedAt: new Date(Date.now() - Math.floor(Math.random() * 1000000000)) // Random time in past ~11 days
            });
        }

        await Anomaly.insertMany(anomalies);
        console.log('Seeded 50 anomalies successfully!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

generateAnomalies();

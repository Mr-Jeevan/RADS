const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['pothole', 'speedbreaker'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    gForce: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    location: {
        // GeoJSON Point
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    imageUrl: {
        type: String
    },
    reportedAt: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere index for geospatial queries
AnomalySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Anomaly', AnomalySchema);

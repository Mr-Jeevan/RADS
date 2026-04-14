const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for dev, adjust for prod
        methods: ['GET', 'POST']
    }
});

// Global vehicle state
global.vehicleState = { isDriving: false, position: null };

io.on('connection', (socket) => {
    socket.on('sync_vehicle_status', (data) => {
        global.vehicleState.isDriving = data.isDriving;
        global.vehicleState.position = data.position;
        console.log(`[Socket] Vehicle state synced: isDriving=${data.isDriving}`);
    });
});

// Expose socket server to frontend routes
app.set('io', io);
// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/anomalies', require('./routes/anomalies'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//     console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
// });


// Add '0.0.0.0' to tell it to listen to external devices on the hotspot
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Ready to receive IoT data on your local IP!`);
});
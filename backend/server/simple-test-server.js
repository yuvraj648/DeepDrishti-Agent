const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5003', 'http://localhost:5007'],
  credentials: true
}));

app.use(express.json());

// Test endpoints
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Simple Test API is running',
    port: 5008,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/test/feeds', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        title: 'Coral Reef Monitoring Camera',
        url: 'https://www.youtube.com/embed/6zrn4-FfbXw',
        status: 'active',
        location: 'Great Barrier Reef',
        sector: 'Sector Alpha',
        activeAlerts: 2
      },
      {
        _id: '2',
        title: 'Deep Sea Exploration Feed',
        url: 'https://www.youtube.com/embed/1Vd2b8sN0Dc',
        status: 'active',
        location: 'Mariana Trench Region',
        sector: 'Sector Beta',
        activeAlerts: 1
      }
    ]
  });
});

const PORT = 5008;

const server = app.listen(PORT, () => {
  console.log(`🚀 Simple Test Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`Feeds: http://localhost:${PORT}/api/v1/test/feeds`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => {
    console.log('Server closed');
  });
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'incubator-monitoring-backend', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL Cloud SQL'
  });
});

// Routes will be added here
app.get('/', (req, res) => {
  res.json({ 
    message: 'NICU Incubator Monitoring System - Unified Backend',
    version: '1.0.0'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Incubator Monitoring Backend listening on port ${PORT}`);
  console.log(`📊 Using PostgreSQL Cloud SQL database`);
});

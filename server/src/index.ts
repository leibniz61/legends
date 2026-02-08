import './env.js'; // Must be first — loads .env before any other imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.js';
import { requestId } from './middleware/requestId.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import categoryRoutes from './routes/categories.js';
import threadRoutes from './routes/threads.js';
import postRoutes from './routes/posts.js';
import subscriptionRoutes from './routes/subscriptions.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import readsRoutes from './routes/reads.js';
import { updateLastSeen } from './middleware/lastSeen.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

// CORS configuration - allows CLIENT_URL, localhost, and Render preview URLs
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:6173',
].filter(Boolean) as string[];

// Pattern for YOUR Render preview URLs only (e.g., bookoflegends-client-pr-42.onrender.com)
const previewPattern = /^https:\/\/bookoflegends.*\.onrender\.com$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow if origin is in the allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow YOUR Render preview URLs only
    if (previewPattern.test(origin)) return callback(null, true);

    callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(requestId);
app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));
app.use(express.json());
app.use(updateLastSeen); // Update user's last_seen_at timestamp

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api', threadRoutes); // Handles /api/threads/* and /api/categories/:slug/threads
app.use('/api', postRoutes); // Handles /api/threads/:id/posts and /api/posts/*
app.use('/api', subscriptionRoutes); // Handles /api/threads/:id/subscribe and /api/subscriptions
app.use('/api', reportRoutes); // Handles /api/posts/:id/report
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', readsRoutes); // Handles /api/unread, /api/threads/:id/read, /api/read-all

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

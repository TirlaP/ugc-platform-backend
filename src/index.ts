import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import type { ErrorHandler } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as cron from 'node-cron';

// Load environment variables
config();

import { authMiddleware, requireOrganization, requireRoles } from './middleware/auth.js';
// Import routes
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import clientRoutes from './routes/clients.js';
import creatorRoutes from './routes/creators.js';
import dashboardRoutes from './routes/dashboard.js';
import driveRoutes from './routes/drive.js';
import emailRoutes from './routes/email.js';
import mediaRoutes from './routes/media.js';
import messageRoutes from './routes/messages.js';
import organizationRoutes from './routes/organizations.js';
import userRoutes from './routes/users.js';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      process.env['FRONTEND_URL'] || 'http://localhost:5173',
      'https://app.platform-test.website/',
      'https://ugc-platform.netlify.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
    ],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/auth', authRoutes);

// Dashboard routes (require auth but no specific org)
app.use('/api/dashboard/*', authMiddleware());
app.route('/api/dashboard', dashboardRoutes);

// Protected routes
app.use('/api/campaigns/*', authMiddleware());
app.use('/api/campaigns/*', requireOrganization());
app.route('/api/campaigns', campaignRoutes);

app.use('/api/clients/*', authMiddleware());
app.use('/api/clients/*', requireOrganization());
app.use('/api/clients/*', requireRoles(['ADMIN', 'STAFF']));
app.route('/api/clients', clientRoutes);

app.use('/api/creators/*', authMiddleware());
app.route('/api/creators', creatorRoutes);

app.use('/api/media/*', authMiddleware());
app.use('/api/media/*', requireOrganization());
app.route('/api/media', mediaRoutes);

app.use('/api/messages/*', authMiddleware());
app.use('/api/messages/*', requireOrganization());
app.route('/api/messages', messageRoutes);

app.use('/api/email/*', authMiddleware());
app.use('/api/email/*', requireOrganization());
app.route('/api/email', emailRoutes);

app.use('/api/drive/*', authMiddleware());
app.use('/api/drive/*', requireOrganization());
app.route('/api/drive', driveRoutes);

app.use('/api/organizations/*', authMiddleware());
app.route('/api/organizations', organizationRoutes);

app.use('/api/users/*', authMiddleware());
app.route('/api/users', userRoutes);

// Global error handler
const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err);

  if (err instanceof Error) {
    return c.json(
      {
        error: err.message,
        ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
      },
      500
    );
  }

  return c.json({ error: 'Internal server error' }, 500);
};

app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Start server
const port = Number.parseInt(process.env['PORT'] || '3000', 10);
console.log(`🚀 Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server is running on http://localhost:${port}`);

// Self-ping cron job to keep the service alive on Render
if (process.env['NODE_ENV'] === 'production') {
  cron.schedule('*/15 * * * * *', async () => {
    try {
      const response = await fetch('https://ugc-platform-backend.onrender.com/health');
      if (response.ok) {
        console.log('✅ Health check ping successful');
      }
    } catch (error) {
      console.error('❌ Health check ping failed:', error);
    }
  });
  console.log('🔄 Self-ping cron job started (every 15 seconds)');
}

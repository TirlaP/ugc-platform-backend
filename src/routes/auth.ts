import { Hono } from 'hono';
import { auth } from '../lib/auth.js';

const authRoutes = new Hono();

// Better Auth handles all auth routes
authRoutes.on(['POST', 'GET'], '/*', (c) => {
  return auth.handler(c.req.raw);
});

export default authRoutes;

import { Hono } from 'hono';
import { auth } from '../lib/auth.js';
import { z } from 'zod';

const authRoutes = new Hono();

// Validation schemas
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  organizationName: z.string().optional(),
});

// Sign in
authRoutes.post('/sign-in', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = signInSchema.parse(body);
    
    const result = await auth.signIn(email, password);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || 'Sign in failed' }, 401);
  }
});

// Sign up
authRoutes.post('/sign-up', async (c) => {
  try {
    const body = await c.req.json();
    const userData = signUpSchema.parse(body);
    
    // Convert undefined to null for Prisma compatibility
    const processedData = {
      ...userData,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      phone: userData.phone || null,
      role: userData.role || 'CLIENT',
      organizationName: userData.organizationName || undefined,
    };
    
    const result = await auth.signUp(processedData);
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || 'Sign up failed' }, 400);
  }
});

// Get current user
authRoutes.get('/me', async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const payload = auth.verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // Fetch fresh user data from database
    const user = await auth.getUserById(payload.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    return c.json({ user });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to get user' }, 401);
  }
});

// Sign out (just a placeholder - token invalidation happens on client)
authRoutes.post('/sign-out', async (c) => {
  return c.json({ success: true });
});

export default authRoutes;
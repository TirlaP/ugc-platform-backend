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
});

// Sign in with debug logging
authRoutes.post('/sign-in', async (c) => {
  try {
    console.log('🔍 Auth request received');
    
    const body = await c.req.json();
    console.log('📝 Request body:', { email: body.email, password: body.password ? '[HIDDEN]' : 'MISSING' });
    
    const { email, password } = signInSchema.parse(body);
    console.log('✅ Schema validation passed');
    
    console.log('🔄 Calling auth.signIn...');
    const result = await auth.signIn(email, password);
    console.log('✅ Auth successful');
    
    return c.json(result);
  } catch (error: any) {
    console.error('❌ Auth error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return c.json({ error: error.message || 'Sign in failed' }, 401);
  }
});

// Sign up
authRoutes.post('/sign-up', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = signUpSchema.parse(body);
    
    const result = await auth.signUp({ email, password, name, role: 'CLIENT' });
    
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || 'Sign up failed' }, 400);
  }
});

// Get current user
authRoutes.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }
  
  const payload = auth.verifyToken(token);
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  return c.json({ user: payload });
});

// Sign out (just a placeholder - token invalidation happens on client)
authRoutes.post('/sign-out', async (c) => {
  return c.json({ success: true });
});

export default authRoutes;
/**
 * Simple JWT-based authentication middleware
 */

import type { Context, Next } from 'hono';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/auth.js';

// Extend context with user
declare module 'hono' {
  interface ContextVariableMap {
    user?: any;
    organization?: any;
  }
}

/**
 * Auth middleware - verifies JWT token
 */
export const authMiddleware = () => {
  return async (c: Context, next: Next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }
    
    const payload = auth.verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    
    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    c.set('user', user);
    return await next();
  };
};

/**
 * Require specific roles
 */
export const requireRoles = (roles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (!roles.includes(user.role || 'CLIENT')) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    return await next();
  };
};

/**
 * Require organization membership
 */
export const requireOrganization = () => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    const orgId = c.req.header('X-Organization-ID');
    
    if (!orgId) {
      return c.json({ error: 'Organization ID required' }, 400);
    }
    
    // Check if user belongs to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
      include: {
        organization: true,
      },
    });
    
    if (!membership) {
      return c.json({ error: 'Not a member of this organization' }, 403);
    }
    
    c.set('organization', membership.organization);
    
    // Enhance user object with organization context
    const userWithOrg = {
      ...user,
      organizationId: orgId,
      organizationRole: membership.role,
    };
    c.set('user', userWithOrg);
    
    return await next();
  };
};
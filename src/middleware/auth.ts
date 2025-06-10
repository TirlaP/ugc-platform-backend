import type { Context, Next } from 'hono';
import { auth } from '../lib/auth.js';
import { prisma } from '../lib/auth.js';

// Auth middleware
export const authMiddleware = () => {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    try {
      // Get session from Better Auth
      const request = c.req.raw;
      const response = await auth.api.getSession({ headers: request.headers });

      if (!response?.session || !response.user) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get full user data with organization
      const user = await prisma.user.findUnique({
        where: { id: response.user.id },
        include: {
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        return c.json({ error: 'User not found' }, 401);
      }

      // Add user and organization to context
      c.set('user', {
        ...user,
        organizationId: user.organizations[0]?.organizationId || null,
      });

      await next();
      return;
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  };
};

// Role-based access control middleware
export const requireRoles = (allowedRoles: string[]) => {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const hasRole = user.role && allowedRoles.includes(user.role);

    if (!hasRole) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
    return;
  };
};

// Organization middleware
export const requireOrganization = () => {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    const user = c.get('user');

    if (!user?.organizationId) {
      return c.json({ error: 'Organization required' }, 403);
    }

    await next();
    return;
  };
};

import { Hono } from 'hono';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const users = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Update user profile (including role)
users.patch('/profile', async (c) => {
  try {
    // Get user from auth middleware
    const user = c.get('user');
    const userId = user.id;

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { role, name, bio, phone } = await c.req.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(name && { name }),
        ...(bio && { bio }),
        ...(phone && { phone }),
      },
    });

    return c.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Quick role switcher for demo purposes
users.post('/switch-role', async (c) => {
  try {
    const { role, userId } = await c.req.json();

    if (!['ADMIN', 'STAFF', 'CREATOR', 'CLIENT'].includes(role)) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return c.json({ message: 'Role updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Switch role error:', error);
    return c.json({ error: 'Failed to switch role' }, 500);
  }
});

export default users;

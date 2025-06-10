import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const organizationRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const createOrganizationSchema = z
  .object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/),
    logo: z.string().url().optional(),
    // description not in schema yet
  })
  .passthrough(); // Allow extra fields for now

// Get all organizations (basic list)
organizationRoutes.get('/', async (c) => {
  const user = c.get('user');
  const { page = '1', limit = '10' } = c.req.query();

  // For now, just return user's organizations
  const organizations = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
              campaigns: true,
              clients: true,
            },
          },
        },
      },
    },
    skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
    take: Number.parseInt(limit),
    orderBy: { joinedAt: 'desc' },
  });

  return c.json({
    organizations: organizations.map((m) => ({
      ...m.organization,
      userRole: m.role,
    })),
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total: organizations.length,
      pages: Math.ceil(organizations.length / Number.parseInt(limit)),
    },
  });
});

// Get current user's organization
organizationRoutes.get('/current', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'No organization' }, 404);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      _count: {
        select: {
          members: true,
          campaigns: true,
          clients: true,
        },
      },
    },
  });

  return c.json(organization);
});

// Create organization (for users without one)
organizationRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  // TODO: Decide business logic - should users be able to create multiple orgs or join multiple?
  // For now, allow creation regardless
  // if (user.organizationId) {
  //   return c.json({ error: 'User already belongs to an organization' }, 400);
  // }

  const result = createOrganizationSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // Check if slug is taken
  const existing = await prisma.organization.findUnique({
    where: { slug: result.data.slug },
  });

  if (existing) {
    return c.json({ error: 'Organization slug already taken' }, 400);
  }

  // Create organization and add user as owner
  const organization = await prisma.organization.create({
    data: {
      name: result.data.name,
      slug: result.data.slug,
      logo: result.data.logo || null,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  return c.json(organization, 201);
});

// Update organization
organizationRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  // Check if user is owner or admin
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: body,
  });

  return c.json(updated);
});

// Get organization members
organizationRoutes.get('/:id/members', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  // Verify user belongs to organization
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      userId: user.id,
    },
  });

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return c.json(members);
});

// Invite member to organization
organizationRoutes.post('/:id/invite', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { email, role = 'MEMBER' } = await c.req.json();

  // Check if user is owner or admin
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId: id,
      userId: user.id,
      role: { in: ['OWNER', 'ADMIN'] },
    },
  });

  if (!member) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Find user by email
  const invitedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!invitedUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Check if already a member
  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: id,
        userId: invitedUser.id,
      },
    },
  });

  if (existingMember) {
    return c.json({ error: 'User is already a member' }, 400);
  }

  // Add user to organization
  const newMember = await prisma.organizationMember.create({
    data: {
      organizationId: id,
      userId: invitedUser.id,
      role,
    },
    include: {
      user: true,
      organization: true,
    },
  });

  return c.json(newMember, 201);
});

export default organizationRoutes;

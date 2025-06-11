import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const creatorRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const createCreatorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
  socialMedia: z.string().optional(),
  rates: z.number().optional(),
});

const updateCreatorSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
});

// Get all creators
creatorRoutes.get('/', async (c) => {
  const { search, page = '1', limit = '10' } = c.req.query();

  const where: {
    role: string;
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' };
      email?: { contains: string; mode: 'insensitive' };
      bio?: { contains: string; mode: 'insensitive' };
    }>;
  } = {
    role: 'CREATOR',
  };

  // Note: status, skills fields don't exist in current schema
  // These can be added later when needed
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { bio: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [creators, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      take: Number.parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Calculate ratings (mock for now)
  const creatorsWithRating = creators.map((creator) => ({
    ...creator,
    rating: 4.5 + Math.random() * 0.5, // Mock rating between 4.5-5.0
    completedOrders: creator._count.orders,
    skills: [], // Mock empty skills for now
    portfolio: [], // Mock empty portfolio for now
    rates: { hourly: 0, perPost: 0, perCampaign: 0, currency: 'USD' }, // Mock rates
    status: 'ACTIVE', // Mock status
  }));

  return c.json({
    creators: creatorsWithRating,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

// Create creator
creatorRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  // Only admins and staff can create creators
  if (!user.role || !['ADMIN', 'STAFF'].includes(user.role)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const result = createCreatorSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: result.data.email },
  });

  if (existingUser) {
    return c.json({ error: 'User with this email already exists' }, 400);
  }

  // Create the creator user with a temporary password
  const tempPassword = await bcrypt.hash('temp123456', 12); // Temporary password, user should change this
  
  const creator = await prisma.user.create({
    data: {
      id: `creator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: result.data.name || '',
      email: result.data.email,
      password: tempPassword,
      emailVerified: false, // They'll need to verify their email
      role: 'CREATOR',
      phone: result.data.phone || null,
      bio: result.data.bio || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      phone: true,
      createdAt: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  // Add mock fields for frontend compatibility
  const creatorWithMockData = {
    ...creator,
    rating: 4.5 + Math.random() * 0.5,
    completedOrders: 0,
    skills: [],
    portfolio: [],
    rates: { hourly: result.data.rates || 0, perPost: 0, perCampaign: 0, currency: 'USD' },
    status: 'ACTIVE',
  };

  return c.json(creatorWithMockData, 201);
});

// Get creator by ID
creatorRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();

  const creator = await prisma.user.findFirst({
    where: {
      id,
      role: 'CREATOR',
    },
    include: {
      orders: {
        include: {
          campaign: {
            include: {
              client: true,
            },
          },
          _count: {
            select: { media: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { orders: true },
      },
    },
  });

  if (!creator) {
    return c.json({ error: 'Creator not found' }, 404);
  }

  // Add calculated fields
  const creatorWithStats = {
    ...creator,
    rating: 4.5 + Math.random() * 0.5, // Mock rating
    completedOrders: creator.orders.filter((o) => o.status === 'COMPLETED').length,
    activeOrders: creator.orders.filter((o) =>
      ['NEW', 'IN_PROGRESS', 'SUBMITTED'].includes(o.status)
    ).length,
  };

  return c.json(creatorWithStats);
});

// Update creator profile (creators can update their own profile)
creatorRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  // Check if user is updating their own profile or is admin/staff
  const isOwnProfile = user.id === id;
  const isAdminStaff = user.role && ['ADMIN', 'STAFF'].includes(user.role);

  if (!isOwnProfile && !isAdminStaff) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  const result = updateCreatorSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  const updateData: { name?: string; phone?: string; bio?: string } = {};
  if (result.data.name !== undefined) updateData.name = result.data.name;
  if (result.data.phone !== undefined) updateData.phone = result.data.phone;
  if (result.data.bio !== undefined) updateData.bio = result.data.bio;

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  return c.json(updated);
});

// Get creator availability
creatorRoutes.get('/:id/availability', async (c) => {
  const { id } = c.req.param();
  // const { from, to } = c.req.query(); // TODO: Use for date filtering

  const creator = await prisma.user.findFirst({
    where: {
      id,
      role: 'CREATOR',
    },
    select: {
      id: true,
      name: true,
      orders: {
        where: {
          status: {
            in: ['NEW', 'IN_PROGRESS'],
          },
        },
        select: {
          id: true,
          campaignId: true,
          status: true,
          assignedAt: true,
        },
      },
    },
  });

  if (!creator) {
    return c.json({ error: 'Creator not found' }, 404);
  }

  return c.json({
    availability: { daysPerWeek: 5, hoursPerDay: 8 }, // Mock availability
    activeOrders: creator.orders,
  });
});

// Get creator stats
creatorRoutes.get('/:id/stats', async (c) => {
  const { id } = c.req.param();
  const { period = '30d' } = c.req.query();

  const creator = await prisma.user.findFirst({
    where: {
      id,
      role: 'CREATOR',
    },
  });

  if (!creator) {
    return c.json({ error: 'Creator not found' }, 404);
  }

  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  if (period === '7d') startDate.setDate(now.getDate() - 7);
  else if (period === '30d') startDate.setDate(now.getDate() - 30);
  else if (period === '90d') startDate.setDate(now.getDate() - 90);

  const stats = await prisma.order.groupBy({
    by: ['status'],
    where: {
      creatorId: id,
      assignedAt: {
        gte: startDate,
      },
    },
    _count: true,
  });

  const mediaStats = await prisma.media.groupBy({
    by: ['status'],
    where: {
      uploadedBy: id,
      createdAt: {
        gte: startDate,
      },
    },
    _count: true,
  });

  return c.json({
    period,
    orders: stats,
    media: mediaStats,
    totalEarnings: 0, // TODO: Calculate from completed orders
  });
});

// Delete creator
creatorRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  // Only admins and staff can delete creators
  if (!user.role || !['ADMIN', 'STAFF'].includes(user.role)) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // Check if creator exists
  const creator = await prisma.user.findFirst({
    where: {
      id,
      role: 'CREATOR',
    },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  if (!creator) {
    return c.json({ error: 'Creator not found' }, 404);
  }

  // Check if creator has any orders (business rule: can't delete if they have orders)
  if (creator._count.orders > 0) {
    return c.json(
      {
        error: 'Cannot delete creator with existing orders. Archive them instead.',
      },
      400
    );
  }

  // Delete the creator (hard delete since no orders exist)
  await prisma.user.delete({
    where: { id },
  });

  return c.json({ success: true });
});

export default creatorRoutes;

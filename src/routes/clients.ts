import type { ClientStatus, Prisma } from '@prisma/client';
import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const clientRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
});

// Get all clients
clientRoutes.get('/', async (c) => {
  const user = c.get('user');
  const { search, status, page = '1', limit = '10' } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const where: Prisma.ClientWhereInput = {
    organizationId: user.organizationId,
  };

  if (status) where.status = status as ClientStatus;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      take: Number.parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count({ where }),
  ]);

  return c.json({
    clients,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

// Get client by ID
clientRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      campaigns: {
        include: {
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  return c.json(client);
});

// Create client
clientRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const result = createClientSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Check if email already exists
  const existing = await prisma.client.findFirst({
    where: {
      email: result.data.email,
      organizationId: user.organizationId,
    },
  });

  if (existing) {
    return c.json({ error: 'Client with this email already exists' }, 400);
  }

  const client = await prisma.client.create({
    data: {
      organizationId: user.organizationId!,
      status: 'ACTIVE',
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || null,
      company: result.data.company || null,
      website: result.data.website || null,
      notes: result.data.notes || null,
    },
  });

  return c.json(client, 201);
});

// Update client
clientRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  const updated = await prisma.client.update({
    where: { id },
    data: body,
  });

  return c.json(updated);
});

// Delete client
clientRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  // Check if client has active campaigns
  const activeCampaigns = await prisma.campaign.count({
    where: {
      clientId: id,
      status: {
        notIn: ['COMPLETED', 'CANCELLED'],
      },
    },
  });

  if (activeCampaigns > 0) {
    return c.json({ error: 'Cannot delete client with active campaigns' }, 400);
  }

  await prisma.client.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  return c.json({ success: true });
});

// Get creators for a specific client
clientRoutes.get('/:id/creators', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { page = '1', limit = '10' } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Check if client exists and belongs to user's organization
  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!client) {
    return c.json({ error: 'Client not found' }, 404);
  }

  // Get unique creators who have worked for this client through orders
  const creators = await prisma.user.findMany({
    where: {
      role: 'CREATOR',
      orders: {
        some: {
          campaign: {
            clientId: id,
          },
        },
      },
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
        select: {
          orders: {
            where: {
              campaign: {
                clientId: id,
              },
            },
          },
        },
      },
    },
    skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
    take: Number.parseInt(limit),
    orderBy: { createdAt: 'desc' },
  });

  // Get total count
  const total = await prisma.user.count({
    where: {
      role: 'CREATOR',
      orders: {
        some: {
          campaign: {
            clientId: id,
          },
        },
      },
    },
  });

  // Add additional stats for each creator
  const creatorsWithStats = await Promise.all(
    creators.map(async (creator) => {
      const orderStats = await prisma.order.groupBy({
        by: ['status'],
        where: {
          creatorId: creator.id,
          campaign: {
            clientId: id,
          },
        },
        _count: true,
      });

      return {
        ...creator,
        ordersForClient: creator._count.orders,
        orderStats,
        rating: 4.5 + Math.random() * 0.5, // Mock rating
      };
    })
  );

  return c.json({
    creators: creatorsWithStats,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

export default clientRoutes;

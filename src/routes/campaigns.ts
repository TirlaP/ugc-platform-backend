import type { CampaignStatus, Prisma } from '@prisma/client';
import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const campaignRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const createCampaignSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  clientId: z.string(),
  requirements: z
    .object({
      contentType: z.array(z.string()).optional().default([]),
      platform: z.array(z.string()).optional().default([]),
      deliverables: z.array(z.string()).optional().default([]),
      guidelines: z.string().optional().default(''),
    })
    .optional(),
  budget: z.number().optional(),
  deadline: z.string().datetime().optional(),
});

// Get all campaigns
campaignRoutes.get('/', async (c) => {
  const user = c.get('user');
  const { status, clientId, search, page = '1', limit = '10' } = c.req.query();

  console.log('user', user)

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const where: Prisma.CampaignWhereInput = {
    organizationId: user.organizationId,
  };

  if (status) where.status = status as CampaignStatus;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { brief: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        client: true,
        _count: {
          select: { orders: true },
        },
      },
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      take: Number.parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.campaign.count({ where }),
  ]);

  return c.json({
    campaigns,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

// Get campaign by ID
campaignRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      client: true,
      createdBy: true,
      orders: {
        include: {
          creator: true,
          _count: {
            select: { media: true },
          },
        },
      },
      media: {
        include: {
          uploader: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  return c.json(campaign);
});

// Create campaign
campaignRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const result = createCampaignSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  const campaignData: Prisma.CampaignCreateInput = {
    organization: { connect: { id: user.organizationId! } },
    client: { connect: { id: result.data.clientId } },
    createdBy: { connect: { id: user.id } },
    status: 'DRAFT',
    title: result.data.title,
    brief: result.data.brief,
  };

  if (result.data.requirements) {
    campaignData.requirements = result.data.requirements;
  }
  if (result.data.budget) {
    campaignData.budget = result.data.budget;
  }
  if (result.data.deadline) {
    campaignData.deadline = result.data.deadline;
  }

  const campaign = await prisma.campaign.create({
    data: campaignData,
    include: {
      client: true,
      createdBy: true,
    },
  });

  return c.json(campaign, 201);
});

// Update campaign
campaignRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: body,
    include: {
      client: true,
      createdBy: true,
    },
  });

  return c.json(updated);
});

// Delete campaign
campaignRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  await prisma.campaign.delete({ where: { id } });

  return c.json({ success: true });
});

// Assign creator to campaign
campaignRoutes.post('/:id/assign', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const { creatorId, notes } = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  const order = await prisma.order.create({
    data: {
      campaignId: id,
      creatorId,
      notes,
      status: 'NEW',
    },
    include: {
      creator: true,
      campaign: true,
    },
  });

  return c.json(order, 201);
});

export default campaignRoutes;

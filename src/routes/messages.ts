import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const messageRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const sendMessageSchema = z.object({
  campaignId: z.string(),
  content: z.string().min(1).max(5000),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        filename: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .optional(),
});

const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Get messages for a campaign
messageRoutes.get('/campaign/:campaignId', async (c) => {
  const user = c.get('user');
  const { campaignId } = c.req.param();
  const { limit = '50', before } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }
  // Verify user has access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      OR: [
        { organizationId: user.organizationId },
        { orders: { some: { creatorId: user.id } } },
        { client: { email: user.email } }, // If user is the client
      ],
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found or access denied' }, 404);
  }

  const where: {
    campaignId: string;
    createdAt?: { lt: Date };
  } = { campaignId };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Number.parseInt(limit),
  });
  // Reverse to show oldest first
  messages.reverse();

  return c.json({ messages, campaign });
});

// Get campaigns with messages (for sidebar)
messageRoutes.get('/campaigns', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Get campaigns user has access to
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { organizationId: user.organizationId },
        { orders: { some: { creatorId: user.id } } },
        { client: { email: user.email } },
      ],
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          company: true,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return c.json(campaigns);
});
// Send a message
messageRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const result = sendMessageSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify user has access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: result.data.campaignId,
      OR: [
        { organizationId: user.organizationId },
        { orders: { some: { creatorId: user.id } } },
        { client: { email: user.email } },
      ],
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found or access denied' }, 404);
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      campaignId: result.data.campaignId,
      senderId: user.id,
      content: result.data.content,
      attachments: result.data.attachments
        ? JSON.parse(JSON.stringify(result.data.attachments))
        : null,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  });
  // Update campaign's updatedAt to move it to top of list
  await prisma.campaign.update({
    where: { id: result.data.campaignId },
    data: { updatedAt: new Date() },
  });

  // TODO: Send email notifications to other participants
  // This would be implemented with your email service

  return c.json(message, 201);
});

// Edit a message
messageRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  const result = updateMessageSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // Verify user owns the message
  const message = await prisma.message.findFirst({
    where: {
      id,
      senderId: user.id,
    },
  });

  if (!message) {
    return c.json({ error: 'Message not found or unauthorized' }, 404);
  }
  // Update message
  const updated = await prisma.message.update({
    where: { id },
    data: {
      content: result.data.content,
      editedAt: new Date(),
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
        },
      },
    },
  });

  return c.json(updated);
});

// Delete a message
messageRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify user owns the message or is admin
  const message = await prisma.message.findFirst({
    where: {
      id,
      OR: [
        { senderId: user.id },
        {
          campaignId: {
            in: await prisma.campaign
              .findMany({ where: { organizationId: user.organizationId }, select: { id: true } })
              .then((campaigns) => campaigns.map((c) => c.id)),
          },
        },
      ],
    },
  });

  if (!message) {
    return c.json({ error: 'Message not found or unauthorized' }, 404);
  }

  // Only allow deletion by sender or admin
  if (message.senderId !== user.id && user.role !== 'ADMIN') {
    return c.json({ error: 'Only message sender or admin can delete' }, 403);
  }

  await prisma.message.delete({
    where: { id },
  });

  return c.json({ success: true });
});

export default messageRoutes;

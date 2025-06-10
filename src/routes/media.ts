import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const mediaRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const uploadMediaSchema = z.object({
  campaignId: z.string(),
  orderId: z.string().optional(),
  type: z.enum(['IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER']),
  metadata: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      duration: z.number().optional(),
      format: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    })
    .optional(),
});

const updateMediaSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  metadata: z.any().optional(),
});

// Get all media (for current user/organization)
mediaRoutes.get('/', async (c) => {
  const user = c.get('user');
  const { status, type, page = '1', limit = '20' } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const where: {
    OR: Array<{
      campaign?: { organizationId: string };
      uploadedBy?: string;
    }>;
    status?: string;
    type?: string;
  } = {
    OR: [{ campaign: { organizationId: user.organizationId } }, { uploadedBy: user.id }],
  };

  if (status) where.status = status;
  if (type) where.type = type;

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
        order: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      take: Number.parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.media.count({ where }),
  ]);

  return c.json({
    media,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

// Get media for a campaign
mediaRoutes.get('/campaign/:campaignId', async (c) => {
  const user = c.get('user');
  const { campaignId } = c.req.param();
  const { status, type, page = '1', limit = '20' } = c.req.query();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify user has access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      OR: [{ organizationId: user.organizationId }, { orders: { some: { creatorId: user.id } } }],
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  const where: {
    campaignId: string;
    status?: string;
    type?: string;
  } = { campaignId };
  if (status) where.status = status;
  if (type) where.type = type;

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        order: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      take: Number.parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.media.count({ where }),
  ]);

  return c.json({
    media,
    pagination: {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      total,
      pages: Math.ceil(total / Number.parseInt(limit)),
    },
  });
});

// Get single media item
mediaRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const media = await prisma.media.findFirst({
    where: {
      id,
      OR: [{ campaign: { organizationId: user.organizationId } }, { uploadedBy: user.id }],
    },
    include: {
      uploader: true,
      campaign: true,
      order: {
        include: {
          creator: true,
        },
      },
    },
  });

  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  return c.json(media);
});

// Upload media (mock - actual file upload would use S3/cloud storage)
mediaRoutes.post('/upload', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const result = uploadMediaSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: result.data.campaignId,
      OR: [{ organizationId: user.organizationId }, { orders: { some: { creatorId: user.id } } }],
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  // If orderId provided, verify creator owns the order
  if (result.data.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: result.data.orderId,
        creatorId: user.id,
      },
    });

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
  }

  // Mock file data - in production, this would come from actual file upload
  const mockFileData = {
    url: `https://storage.example.com/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    thumbnailUrl: `https://storage.example.com/thumb-${Date.now()}`,
    size: Math.floor(Math.random() * 10000000), // Random size up to 10MB
    filename: `file-${Date.now()}.${result.data.type.toLowerCase()}`,
    mimeType:
      result.data.type === 'IMAGE'
        ? 'image/jpeg'
        : result.data.type === 'VIDEO'
          ? 'video/mp4'
          : result.data.type === 'DOCUMENT'
            ? 'application/pdf'
            : 'application/octet-stream',
  };

  const mediaData = {
    campaignId: result.data.campaignId,
    orderId: result.data.orderId || null,
    type: result.data.type,
    ...mockFileData,
    uploadedBy: user.id,
    status: 'PENDING' as const,
    ...(result.data.metadata && { metadata: result.data.metadata }),
  };

  const media = await prisma.media.create({
    data: mediaData,
    include: {
      uploader: true,
      order: true,
    },
  });

  return c.json(media, 201);
});

// Update media status
mediaRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json();

  const result = updateMediaSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Check if user can update (must be staff/admin or uploader)
  const media = await prisma.media.findFirst({
    where: {
      id,
      OR: [{ campaign: { organizationId: user.organizationId } }, { uploadedBy: user.id }],
    },
  });

  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  // Only staff/admin can change status
  if (result.data.status && (!user.role || !['ADMIN', 'STAFF'].includes(user.role))) {
    return c.json({ error: 'Only staff can update media status' }, 403);
  }

  const updateData = {
    ...(result.data.status && { status: result.data.status }),
    ...(result.data.metadata && { metadata: result.data.metadata }),
  };

  const updated = await prisma.media.update({
    where: { id },
    data: updateData,
    include: {
      uploader: true,
      order: true,
    },
  });

  return c.json(updated);
});

// Delete media
mediaRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const media = await prisma.media.findFirst({
    where: {
      id,
      uploadedBy: user.id, // Only uploader can delete
    },
  });

  if (!media) {
    return c.json({ error: 'Media not found or unauthorized' }, 404);
  }

  // Soft delete by updating status
  await prisma.media.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  return c.json({ success: true });
});

export default mediaRoutes;

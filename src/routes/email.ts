import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const emailRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const emailSettingsSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'custom']),
  emailAddress: z.string().email(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  enableCampaignEmails: z.boolean().default(true),
  autoForward: z.boolean().default(false),
});

const emailThreadSchema = z.object({
  campaignId: z.string(),
  subject: z.string(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  body: z.string(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        url: z.string(),
        size: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

// Get email settings for organization
emailRoutes.get('/settings', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 400);
  }

  // For now, return mock settings
  // In production, this would fetch from a EmailSettings table
  const settings = {
    provider: 'gmail',
    emailAddress: `campaigns@${user.organizationId}.ugc-impact.com`,
    enableCampaignEmails: true,
    autoForward: false,
    configured: false,
  };

  return c.json(settings);
});

// Update email settings
emailRoutes.post('/settings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Only admins can configure email settings
  if (user.role !== 'ADMIN') {
    return c.json({ error: 'Only admins can configure email settings' }, 403);
  }

  const result = emailSettingsSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // In production, save to database
  // For now, return success
  return c.json({
    success: true,
    settings: result.data,
  });
});

// Get email threads for a campaign
emailRoutes.get('/campaign/:campaignId/threads', async (c) => {
  const user = c.get('user');
  const { campaignId } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      organizationId: user.organizationId,
    },
    include: {
      client: true,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found or access denied' }, 404);
  }

  // For now, return messages as email threads
  // In production, this would integrate with email provider
  const messages = await prisma.message.findMany({
    where: { campaignId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group messages into threads
  const threads = messages.map((msg) => ({
    id: msg.id,
    subject: `Re: ${campaign.title}`,
    from: msg.sender.email,
    to: [campaign.client?.email || 'client@example.com'],
    date: msg.createdAt,
    body: msg.content,
    attachments: msg.attachments || [],
    read: true,
  }));

  return c.json({ threads });
});

// Send email for campaign
emailRoutes.post('/send', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const result = emailThreadSchema.safeParse(body);
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
      organizationId: user.organizationId,
    },
    include: {
      client: true,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found or access denied' }, 404);
  }

  // In production, this would send actual email via provider
  // For now, create a message in the database
  const message = await prisma.message.create({
    data: {
      campaignId: result.data.campaignId,
      senderId: user.id,
      content: result.data.body,
      attachments: result.data.attachments
        ? JSON.parse(JSON.stringify(result.data.attachments))
        : null,
    },
  });

  // Mock email response
  const emailResponse = {
    id: message.id,
    messageId: `<${message.id}@ugc-impact.com>`,
    threadId: result.data.campaignId,
    subject: result.data.subject,
    from: user.email,
    to: result.data.to,
    cc: result.data.cc,
    date: message.createdAt,
    status: 'sent',
  };

  return c.json(emailResponse, 201);
});

// Sync emails from provider
emailRoutes.post('/sync', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return c.json({ error: 'Only admin/staff can sync emails' }, 403);
  }

  // In production, this would:
  // 1. Connect to email provider (Gmail API, Outlook API, etc)
  // 2. Fetch new emails
  // 3. Match emails to campaigns based on subject/recipients
  // 4. Create messages in database
  // 5. Notify relevant users

  // For now, return mock result
  return c.json({
    synced: 0,
    new: 0,
    errors: [],
    lastSync: new Date().toISOString(),
  });
});

// Get email template for campaign
emailRoutes.get('/campaign/:campaignId/template', async (c) => {
  const user = c.get('user');
  const { campaignId } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Verify access to campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      organizationId: user.organizationId,
    },
    include: {
      client: true,
      organization: true,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found or access denied' }, 404);
  }

  // Generate email template
  const template = {
    subject: `[${campaign.title}] Update`,
    body: `Hi ${campaign.client?.name || 'there'},\n\nHere's an update on your campaign "${campaign.title}".\n\n[Your message here]\n\nBest regards,\n${user.name}`,
    signature: `\n\n--\n${user.name}\n${campaign.organization?.name || 'Organization'}\n${user.email}`,
  };

  return c.json(template);
});

export default emailRoutes;

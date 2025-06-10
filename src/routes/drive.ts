import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/auth.js';
import type { UserWithOrganization } from '../types/index.js';

const driveRoutes = new Hono<{ Variables: { user: UserWithOrganization } }>();

// Validation schemas
const driveSettingsSchema = z.object({
  enabled: z.boolean(),
  folderId: z.string().optional(),
  folderStructure: z.enum(['flat', 'by-client', 'by-campaign', 'by-date']).default('by-campaign'),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().min(5).max(60).default(15), // minutes
});

const driveFolderSchema = z.object({
  name: z.string(),
  parentId: z.string().optional(),
  campaignId: z.string().optional(),
  clientId: z.string().optional(),
});

// Get Google Drive settings
driveRoutes.get('/settings', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Mock settings for now
  const settings = {
    enabled: false,
    connected: false,
    email: null,
    folderId: null,
    folderStructure: 'by-campaign',
    autoSync: true,
    syncInterval: 15,
    lastSync: null,
    usage: {
      used: 0,
      total: 15 * 1024 * 1024 * 1024, // 15GB
      percentage: 0,
    },
  };

  return c.json(settings);
});

// Update Google Drive settings
driveRoutes.post('/settings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  if (user.role !== 'ADMIN') {
    return c.json({ error: 'Only admins can configure Google Drive' }, 403);
  }

  const result = driveSettingsSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // In production, save to database
  return c.json({
    success: true,
    settings: result.data,
  });
});

// Connect Google Drive (OAuth flow)
driveRoutes.get('/connect', async (c) => {
  const user = c.get('user');

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  if (user.role !== 'ADMIN') {
    return c.json({ error: 'Only admins can connect Google Drive' }, 403);
  }

  // In production, this would initiate OAuth flow
  // For now, return auth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent('http://localhost:3000/api/drive/callback')}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive')}&access_type=offline&state=${user.organizationId}`;

  return c.json({ authUrl });
});

// List files from Google Drive
driveRoutes.get('/files', async (c) => {
  const user = c.get('user');
  const { folderId, search } = c.req.query();
  // const { campaignId } = c.req.query(); // TODO: Use for filtering

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Mock file list for now
  const files = [
    {
      id: '1',
      name: 'Campaign Brief.pdf',
      mimeType: 'application/pdf',
      size: 1024 * 1024 * 2, // 2MB
      createdTime: new Date('2024-01-15'),
      modifiedTime: new Date('2024-01-15'),
      webViewLink: 'https://drive.google.com/file/1',
      webContentLink: 'https://drive.google.com/download/1',
      thumbnailLink: null,
      parents: [folderId || 'root'],
      capabilities: {
        canEdit: true,
        canDownload: true,
        canDelete: true,
      },
    },
    {
      id: '2',
      name: 'Product Video.mp4',
      mimeType: 'video/mp4',
      size: 1024 * 1024 * 150, // 150MB
      createdTime: new Date('2024-01-20'),
      modifiedTime: new Date('2024-01-20'),
      webViewLink: 'https://drive.google.com/file/2',
      webContentLink: 'https://drive.google.com/download/2',
      thumbnailLink: 'https://drive.google.com/thumbnail/2',
      parents: [folderId || 'root'],
      capabilities: {
        canEdit: true,
        canDownload: true,
        canDelete: false,
      },
    },
  ];

  // Filter by search if provided
  const filtered = search
    ? files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : files;

  return c.json({
    files: filtered,
    nextPageToken: null,
  });
});

// Create folder in Google Drive
driveRoutes.post('/folders', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  const result = driveFolderSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  // In production, this would create folder via Google Drive API
  const folder = {
    id: `folder-${Date.now()}`,
    name: result.data.name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [result.data.parentId || 'root'],
    createdTime: new Date(),
    webViewLink: `https://drive.google.com/drive/folders/folder-${Date.now()}`,
  };

  return c.json(folder, 201);
});

// Sync campaign files with Google Drive
driveRoutes.post('/sync/campaign/:campaignId', async (c) => {
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
      media: true,
    },
  });

  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404);
  }

  // In production, this would:
  // 1. Create folder structure in Drive
  // 2. Upload media files to Drive
  // 3. Share folder with client
  // 4. Update database with Drive IDs

  const syncResult = {
    campaignId,
    folderId: `folder-${campaignId}`,
    folderLink: `https://drive.google.com/drive/folders/folder-${campaignId}`,
    filesUploaded: campaign.media.length,
    sharedWith: [campaign.client?.email],
    syncedAt: new Date(),
  };

  return c.json(syncResult);
});

// Get campaign folder structure
driveRoutes.get('/campaign/:campaignId/structure', async (c) => {
  const user = c.get('user');
  const { campaignId } = c.req.param();

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // Mock folder structure
  const structure = {
    root: {
      id: `folder-${campaignId}`,
      name: 'Campaign Files',
      folders: [
        {
          id: `folder-${campaignId}-raw`,
          name: 'Raw Files',
          fileCount: 5,
        },
        {
          id: `folder-${campaignId}-edited`,
          name: 'Edited Files',
          fileCount: 3,
        },
        {
          id: `folder-${campaignId}-final`,
          name: 'Final Deliverables',
          fileCount: 2,
        },
      ],
    },
  };

  return c.json(structure);
});

// Share Drive folder with users
driveRoutes.post('/share', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const shareSchema = z.object({
    fileId: z.string(),
    email: z.string().email(),
    role: z.enum(['reader', 'writer', 'commenter']).default('reader'),
    sendNotification: z.boolean().default(true),
  });

  const result = shareSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.errors }, 400);
  }

  if (!user.organizationId) {
    return c.json({ error: 'User not associated with an organization' }, 403);
  }

  // In production, share via Google Drive API
  const permission = {
    id: `perm-${Date.now()}`,
    type: 'user',
    emailAddress: result.data.email,
    role: result.data.role,
    displayName: result.data.email,
  };

  return c.json({
    success: true,
    permission,
  });
});

export default driveRoutes;

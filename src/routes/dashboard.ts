import { Hono } from 'hono';
import { prisma } from '../lib/auth.js';

const dashboard = new Hono();

// Get dashboard statistics
dashboard.get('/stats', async (c) => {
  try {
    // Get organization from context (we'll implement this later)
    // For now, get the first organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      return c.json({ error: 'No organization found' }, 404);
    }

    const [
      totalCampaigns,
      activeCampaigns,
      totalClients,
      activeClients,
      totalCreators,
      totalOrders,
      inProgressOrders,
      completedOrders,
      totalRevenue,
    ] = await Promise.all([
      // Total campaigns
      prisma.campaign.count({
        where: { organizationId: org.id },
      }),

      // Active campaigns
      prisma.campaign.count({
        where: {
          organizationId: org.id,
          status: { in: ['ACTIVE', 'IN_PROGRESS'] },
        },
      }),

      // Total clients
      prisma.client.count({
        where: { organizationId: org.id },
      }),

      // Active clients
      prisma.client.count({
        where: {
          organizationId: org.id,
          status: 'ACTIVE',
        },
      }),

      // Total creators (organization members with CREATOR role)
      prisma.organizationMember.count({
        where: {
          organizationId: org.id,
          user: { role: 'CREATOR' },
        },
      }),

      // Total orders
      prisma.order.count({
        where: {
          campaign: { organizationId: org.id },
        },
      }),

      // In progress orders
      prisma.order.count({
        where: {
          campaign: { organizationId: org.id },
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        },
      }),

      // Completed orders
      prisma.order.count({
        where: {
          campaign: { organizationId: org.id },
          status: 'COMPLETED',
        },
      }),

      // Total revenue (sum of campaign budgets)
      prisma.campaign.aggregate({
        where: {
          organizationId: org.id,
          status: { not: 'CANCELLED' },
        },
        _sum: { budget: true },
      }),
    ]);

    return c.json({
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
      },
      clients: {
        total: totalClients,
        active: activeClients,
      },
      creators: {
        total: totalCreators,
      },
      orders: {
        total: totalOrders,
        inProgress: inProgressOrders,
        completed: completedOrders,
      },
      revenue: {
        total: totalRevenue._sum.budget || 0,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return c.json({ error: 'Failed to fetch dashboard stats' }, 500);
  }
});

// Get recent activities
dashboard.get('/activities', async (c) => {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return c.json({ error: 'No organization found' }, 404);
    }

    // Get recent activities across the platform
    const [recentCampaigns, recentOrders, recentClients] = await Promise.all([
      // Recent campaigns
      prisma.campaign.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      }),

      // Recent orders
      prisma.order.findMany({
        where: {
          campaign: { organizationId: org.id },
        },
        orderBy: { assignedAt: 'desc' },
        take: 5,
        include: {
          campaign: { select: { title: true } },
          creator: { select: { name: true } },
        },
      }),

      // Recent clients
      prisma.client.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return c.json({
      recentCampaigns,
      recentOrders,
      recentClients,
    });
  } catch (error) {
    console.error('Dashboard activities error:', error);
    return c.json({ error: 'Failed to fetch dashboard activities' }, 500);
  }
});

export default dashboard;

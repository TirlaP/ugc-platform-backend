import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting better database seed...');
  
  // Create default password hash for demo users
  const defaultPassword = await bcrypt.hash('demo123456', 12);
  console.log('🔒 Generated default password hash');
  
  // Create the main demo organization first
  const organization = await prisma.organization.create({
    data: {
      id: 'demo_org_main',
      name: 'Demo Agency',
      slug: 'demo-agency',
    },
  });
  console.log('✅ Created organization:', organization.name);

  // Create admin user with organization membership
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin_user_demo',
      email: 'admin@demo.com',
      password: defaultPassword,
      name: 'Demo Admin',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ADMIN',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Add admin to organization
  await prisma.organizationMember.create({
    data: {
      id: 'admin_member_demo',
      organizationId: organization.id,
      userId: adminUser.id,
      role: 'OWNER',
      joinedAt: new Date(),
    },
  });
  console.log('✅ Created admin user and added to organization:', adminUser.email);

  // Create staff user
  const staffUser = await prisma.user.create({
    data: {
      id: 'staff_user_demo',
      email: 'staff@demo.com',
      password: defaultPassword,
      name: 'Demo Staff',
      firstName: 'Demo',
      lastName: 'Staff',
      role: 'STAFF',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Add staff to organization
  await prisma.organizationMember.create({
    data: {
      id: 'staff_member_demo',
      organizationId: organization.id,
      userId: staffUser.id,
      role: 'ADMIN',
      joinedAt: new Date(),
    },
  });
  console.log('✅ Created staff user and added to organization:', staffUser.email);

  // Create creator users
  const creators = [];
  const creatorData = [
    { id: 'creator_1', email: 'sarah@creator.com', name: 'Sarah Johnson', firstName: 'Sarah', lastName: 'Johnson' },
    { id: 'creator_2', email: 'mike@creator.com', name: 'Mike Chen', firstName: 'Mike', lastName: 'Chen' },
    { id: 'creator_3', email: 'emma@creator.com', name: 'Emma Williams', firstName: 'Emma', lastName: 'Williams' },
  ];

  for (const creator of creatorData) {
    const user = await prisma.user.create({
      data: {
        ...creator,
        password: defaultPassword,
        role: 'CREATOR',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    creators.push(user);
  }
  console.log(`✅ Created ${creators.length} creators`);

  // Create demo clients in the organization
  const clients = [];
  const clientData = [
    { name: 'Tech Startup Inc', email: 'hello@techstartup.com', company: 'Tech Startup Inc' },
    { name: 'Fashion Brand Co', email: 'contact@fashionbrand.com', company: 'Fashion Brand Co' },
    { name: 'Food Company LLC', email: 'info@foodcompany.com', company: 'Food Company LLC' },
  ];

  for (const clientInfo of clientData) {
    const client = await prisma.client.create({
      data: {
        id: `client_${clientInfo.name.replace(/\s+/g, '_').toLowerCase()}`,
        organizationId: organization.id,
        ...clientInfo,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    clients.push(client);
  }
  console.log(`✅ Created ${clients.length} clients`);

  // Create demo campaigns
  const campaigns = [];
  const campaignData = [
    { 
      title: 'Summer Product Launch',
      brief: 'Create engaging UGC content for our new summer product line',
      clientId: clients[0]!.id,
    },
    {
      title: 'Brand Awareness Campaign',
      brief: 'Showcase our brand values through authentic creator content',
      clientId: clients[1]!.id,
    },
    {
      title: 'Holiday Collection Promotion',
      brief: 'Feature our holiday collection in lifestyle content',
      clientId: clients[2]!.id,
    },
  ];

  for (const campaignInfo of campaignData) {
    const campaign = await prisma.campaign.create({
      data: {
        id: `campaign_${campaignInfo.title.replace(/\s+/g, '_').toLowerCase()}`,
        organizationId: organization.id,
        createdById: adminUser.id,
        ...campaignInfo,
        budget: 5000.00,
        status: 'ACTIVE',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    campaigns.push(campaign);
  }
  console.log(`✅ Created ${campaigns.length} campaigns`);

  // Create some orders
  const orders = [];
  for (let i = 0; i < Math.min(campaigns.length, creators.length); i++) {
    const order = await prisma.order.create({
      data: {
        id: `order_${i + 1}`,
        campaignId: campaigns[i]!.id,
        creatorId: creators[i]!.id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        notes: `Order for ${campaigns[i]!.title}`,
      },
    });
    orders.push(order);
  }
  console.log(`✅ Created ${orders.length} orders`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Demo credentials:');
  console.log(`👑 Admin: admin@demo.com (Organization Owner)`);
  console.log(`👨‍💼 Staff: staff@demo.com (Organization Admin)`);
  console.log(`🎬 Creators: ${creators.map(c => c.email).join(', ')}`);
  console.log(`\n🏢 Organization: ${organization.name} (ID: ${organization.id})`);
  console.log(`📊 Created: ${clients.length} clients, ${campaigns.length} campaigns, ${orders.length} orders`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
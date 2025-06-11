import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  
  // Password hashing removed - not needed with current schema
  // const hashedPassword = await bcrypt.hash('demo123456', 10);

  // Create test organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Agency',
      slug: 'demo-agency',
    },
  });
  console.log('✅ Created organization:', organization.name);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      id: 'admin_user_1',
      email: 'admin@demo.com',
      // password field removed
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      organizations: {
        create: {
          organizationId: organization.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create staff user
  const staffUser = await prisma.user.create({
    data: {
      id: 'staff_user_1',
      email: 'staff@demo.com',
      // password field removed
      name: 'Staff Member',
      role: 'STAFF',
      emailVerified: true,
      organizations: {
        create: {
          organizationId: organization.id,
          role: 'ADMIN',
        },
      },
    },
  });
  console.log('✅ Created staff user:', staffUser.email);

  // Create creators
  const creators = await Promise.all([
    prisma.user.create({
      data: {
        id: 'creator_user_1',
        email: 'sarah@creator.com',
        // password field removed
        name: 'Sarah Johnson',
        role: 'CREATOR',
        emailVerified: true,
        bio: 'Fashion and lifestyle content creator with 5 years experience',
      },
    }),
    prisma.user.create({
      data: {
        id: 'creator_user_2',
        email: 'mike@creator.com',
        // password field removed
        name: 'Mike Chen',
        role: 'CREATOR',
        emailVerified: true,
        bio: 'Tech enthusiast and gaming content creator',
      },
    }),
    prisma.user.create({
      data: {
        id: 'creator_user_3',
        email: 'emma@creator.com',
        // password field removed
        name: 'Emma Williams',
        role: 'CREATOR',
        emailVerified: true,
        bio: 'Food and travel photographer creating stunning visual content',
      },
    }),
  ]);
  console.log(`✅ Created ${creators.length} creators`);

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'Fashion Brand Co.',
        email: 'contact@fashionbrand.com',
        company: 'Fashion Brand Co.',
        website: 'https://fashionbrand.com',
        status: 'ACTIVE',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'TechCorp Inc.',
        email: 'marketing@techcorp.com',
        company: 'TechCorp Inc.',
        website: 'https://techcorp.com',
        status: 'ACTIVE',
      },
    }),
    prisma.client.create({
      data: {
        organizationId: organization.id,
        name: 'Tasty Foods Ltd.',
        email: 'brand@tastyfoods.com',
        company: 'Tasty Foods Ltd.',
        website: 'https://tastyfoods.com',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✅ Created ${clients.length} clients`);

  // Create campaigns
  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        organizationId: organization.id,
        clientId: clients[0].id,
        createdById: adminUser.id,
        title: 'Summer Fashion Campaign',
        brief: 'Create engaging content for our summer collection launch',
        requirements: {
          contentType: ['Photos', 'Reels'],
          platform: ['Instagram', 'TikTok'],
          deliverables: ['5 photos', '3 reels'],
          guidelines: 'Bright, summery vibes with focus on beachwear',
        },
        budget: 5000,
        deadline: new Date('2025-07-15'),
        status: 'ACTIVE',
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId: organization.id,
        clientId: clients[1].id,
        createdById: staffUser.id,
        title: 'Tech Product Launch',
        brief: 'Showcase our new smartphone features',
        requirements: {
          contentType: ['Videos', 'Reviews'],
          platform: ['YouTube', 'Instagram'],
          deliverables: ['1 unboxing video', '1 review video', '5 feature highlights'],
          guidelines: 'Professional, informative, highlight key features',
        },
        budget: 10000,
        deadline: new Date('2025-06-30'),
        status: 'IN_PROGRESS',
      },
    }),
    prisma.campaign.create({
      data: {
        organizationId: organization.id,
        clientId: clients[2].id,
        createdById: adminUser.id,
        title: 'Food & Beverage Promotion',
        brief: 'Promote our new healthy snack line',
        requirements: {
          contentType: ['Photos', 'Stories'],
          platform: ['Instagram', 'Facebook'],
          deliverables: ['10 product photos', '5 lifestyle shots'],
          guidelines: 'Natural, healthy lifestyle focus',
        },
        budget: 3000,
        deadline: new Date('2025-06-20'),
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✅ Created ${campaigns.length} campaigns`);

  // Create orders (assign creators to campaigns)
  const orders = await Promise.all([
    // Fashion campaign orders
    prisma.order.create({
      data: {
        campaignId: campaigns[0].id,
        creatorId: creators[0].id, // Sarah
        status: 'IN_PROGRESS',
        notes: 'Focus on beachwear collection',
      },
    }),
    prisma.order.create({
      data: {
        campaignId: campaigns[0].id,
        creatorId: creators[2].id, // Emma
        status: 'NEW',
        notes: 'Photography specialist for product shots',
      },
    }),
    // Tech campaign orders
    prisma.order.create({
      data: {
        campaignId: campaigns[1].id,
        creatorId: creators[1].id, // Mike
        status: 'IN_PROGRESS',
        notes: 'Tech review specialist',
      },
    }),
    // Food campaign orders
    prisma.order.create({
      data: {
        campaignId: campaigns[2].id,
        creatorId: creators[2].id, // Emma
        status: 'SUBMITTED',
        notes: 'Food photography expert',
      },
    }),
  ]);
  console.log(`✅ Created ${orders.length} orders`);

  // Create some sample media
  const media = await Promise.all([
    prisma.media.create({
      data: {
        campaignId: campaigns[0].id,
        orderId: orders[0].id,
        uploadedBy: creators[0].id,
        url: 'https://storage.example.com/fashion-1.jpg',
        thumbnailUrl: 'https://storage.example.com/thumb-fashion-1.jpg',
        type: 'IMAGE',
        size: 2048576,
        filename: 'beach-collection-1.jpg',
        mimeType: 'image/jpeg',
        status: 'APPROVED',
        metadata: {
          width: 1920,
          height: 1080,
          tags: ['beachwear', 'summer', 'fashion'],
        },
      },
    }),
    prisma.media.create({
      data: {
        campaignId: campaigns[1].id,
        orderId: orders[2].id,
        uploadedBy: creators[1].id,
        url: 'https://storage.example.com/tech-review.mp4',
        type: 'VIDEO',
        size: 104857600,
        filename: 'smartphone-review.mp4',
        mimeType: 'video/mp4',
        status: 'PENDING',
        metadata: {
          duration: 600,
          format: 'mp4',
          tags: ['review', 'smartphone', 'tech'],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${media.length} media items`);

  console.log('✅ Database seeded successfully!');
  console.log('\n📝 Test credentials:');
  console.log('Admin: admin@demo.com');
  console.log('Staff: staff@demo.com');
  console.log('Creators: sarah@creator.com, mike@creator.com, emma@creator.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

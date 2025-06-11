import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Hash password for all test users
  const hashedPassword = await bcrypt.hash('demo123456', 10);

  // Create a default organization
  const org = await prisma.organization.create({
    data: {
      name: 'UGC Agency Demo',
      slug: 'ugc-agency-demo',
      logo: null,
    },
  });

  console.log('✅ Created organization:', org.name);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'admin@ugc-agency.com',
      password: hashedPassword,
      name: 'Petru Tirla',
      role: 'ADMIN',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log('✅ Created admin user:', adminUser.email);
  // Add admin to organization
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: adminUser.id,
      role: 'OWNER',
    },
  });
  console.log('✅ Added admin to organization');

  // Create sample creators
  const creator1 = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'emma@creators.com',
      password: hashedPassword,
      name: 'Emma Rodriguez',
      role: 'CREATOR',
      emailVerified: true,
      bio: 'Lifestyle and beauty content creator',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const creator2 = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: 'marcus@creators.com',
      password: hashedPassword,
      name: 'Marcus Chen',
      role: 'CREATOR',
      emailVerified: true,
      bio: 'Fashion and fitness influencer',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log('✅ Created sample creators');

  // Create sample clients
  const client1 = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Nike Running',
      email: 'marketing@nike.com',
      phone: '+1-555-0123',
      company: 'Nike Inc.',
      website: 'https://nike.com',
      notes: 'Premium athletic brand focused on running campaigns',
      status: 'ACTIVE',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: 'Glossier Beauty',
      email: 'partnerships@glossier.com',
      phone: '+1-555-0456',
      company: 'Glossier Inc.',
      website: 'https://glossier.com',
      notes: 'Beauty brand targeting Gen Z with authentic content',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created sample clients');

  // Create sample campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      clientId: client1.id,
      createdById: adminUser.id,
      title: 'Nike Air Max Campaign',
      brief: 'Create authentic UGC content showcasing Nike Air Max sneakers in everyday settings. Focus on comfort, style, and versatility.',
      requirements: {
        deliverables: ['5 Instagram posts', '3 TikTok videos', '2 YouTube shorts'],
        style: 'Casual, authentic, street-style',
        hashtags: ['#NikeAirMax', '#JustDoIt', '#NikePartner'],
        deadline: '2025-07-01',
      },
      budget: 5000.00,
      deadline: new Date('2025-07-01'),
      status: 'ACTIVE',
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      clientId: client2.id,
      createdById: adminUser.id,
      title: 'Glossier Summer Glow',
      brief: 'Showcase Glossier summer makeup looks with natural lighting. Target audience: women 18-30 interested in minimal makeup.',
      requirements: {
        deliverables: ['8 Instagram posts', '4 TikTok videos', '1 YouTube tutorial'],
        style: 'Clean, minimal, natural lighting',
        hashtags: ['#GlossierPartner', '#SummerGlow', '#CleanGirl'],
        deadline: '2025-06-15',
      },
      budget: 3500.00,
      deadline: new Date('2025-06-15'),
      status: 'IN_PROGRESS',
    },
  });

  console.log('✅ Created sample campaigns');

  // Create sample orders
  await prisma.order.create({
    data: {
      campaignId: campaign1.id,
      creatorId: creator1.id,
      status: 'ASSIGNED',
      notes: 'Creator has experience with athletic brands',
    },
  });

  await prisma.order.create({
    data: {
      campaignId: campaign2.id,
      creatorId: creator1.id,
      status: 'IN_PROGRESS',
      notes: 'Perfect match for beauty content',
    },
  });

  await prisma.order.create({
    data: {
      campaignId: campaign1.id,
      creatorId: creator2.id,
      status: 'NEW',
      notes: 'Great for fitness content',
    },
  });

  console.log('✅ Created sample orders');

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📝 Test Accounts:');
  console.log('   Admin: admin@ugc-agency.com / demo123456');
  console.log('   Creator 1: emma@creators.com / demo123456');
  console.log('   Creator 2: marcus@creators.com / demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
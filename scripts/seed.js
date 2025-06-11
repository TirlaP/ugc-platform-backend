import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');
  
  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('demo123456', 10);

  // Create or find the default organization
  let org = await prisma.organization.findUnique({
    where: { slug: 'ugc-agency-demo' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'UGC Agency Demo',
        slug: 'ugc-agency-demo',
        logo: null,
      },
    });
    console.log('✅ Created organization:', org.name);
  } else {
    console.log('✅ Found existing organization:', org.name);
  }

  // Create or update admin user with direct password storage
  let adminUser = await prisma.user.findUnique({
    where: { email: 'admin@demo.com' },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Demo Admin',
        role: 'ADMIN',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created admin user:', adminUser.email);
  } else {
    // Update existing user with password and ensure admin role
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { 
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true,
        name: 'Demo Admin',
      },
    });
    console.log('✅ Updated admin user:', adminUser.email);
  }

  // Add user to organization (if not already a member)
  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: adminUser.id,
      },
    },
  });

  if (!existingMember) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: adminUser.id,
        role: 'OWNER',
      },
    });
    console.log('✅ Added admin to organization');
  } else {
    console.log('✅ Admin already member of organization');
  }

  // Create sample clients (if they don't exist)
  let client1 = await prisma.client.findFirst({
    where: { email: 'marketing@nike.com', organizationId: org.id },
  });

  if (!client1) {
    client1 = await prisma.client.create({
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
    console.log('✅ Created Nike client');
  }

  let client2 = await prisma.client.findFirst({
    where: { email: 'partnerships@glossier.com', organizationId: org.id },
  });

  if (!client2) {
    client2 = await prisma.client.create({
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
    console.log('✅ Created Glossier client');
  }

  // Create sample campaigns (if they don't exist)
  let campaign1 = await prisma.campaign.findFirst({
    where: { title: 'Nike Air Max Campaign', organizationId: org.id },
  });

  if (!campaign1) {
    campaign1 = await prisma.campaign.create({
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
    console.log('✅ Created Nike campaign');
  }

  let campaign2 = await prisma.campaign.findFirst({
    where: { title: 'Glossier Summer Glow', organizationId: org.id },
  });

  if (!campaign2) {
    campaign2 = await prisma.campaign.create({
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
    console.log('✅ Created Glossier campaign');
  }

  // Create sample creators (if they don't exist)
  let creator1 = await prisma.user.findUnique({
    where: { email: 'emma@creators.com' },
  });

  if (!creator1) {
    creator1 = await prisma.user.create({
      data: {
        email: 'emma@creators.com',
        password: hashedPassword,
        name: 'Emma Rodriguez',
        role: 'CREATOR',
        emailVerified: true,
        bio: 'Lifestyle and beauty content creator with 150K+ followers',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created sample creator: Emma');
  }

  let creator2 = await prisma.user.findUnique({
    where: { email: 'marcus@creators.com' },
  });

  if (!creator2) {
    creator2 = await prisma.user.create({
      data: {
        email: 'marcus@creators.com',
        password: hashedPassword,
        name: 'Marcus Chen',
        role: 'CREATOR',
        emailVerified: true,
        bio: 'Fashion and fitness influencer with authentic street style',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created sample creator: Marcus');
  }

  // Create sample orders (if they don't exist)
  const existingOrder1 = await prisma.order.findFirst({
    where: { campaignId: campaign1.id, creatorId: creator1.id },
  });

  if (!existingOrder1) {
    await prisma.order.create({
      data: {
        campaignId: campaign1.id,
        creatorId: creator1.id,
        status: 'ASSIGNED',
        notes: 'Creator has experience with athletic brands',
      },
    });
    console.log('✅ Created sample order: Emma + Nike campaign');
  }

  const existingOrder2 = await prisma.order.findFirst({
    where: { campaignId: campaign2.id, creatorId: creator1.id },
  });

  if (!existingOrder2) {
    await prisma.order.create({
      data: {
        campaignId: campaign2.id,
        creatorId: creator1.id,
        status: 'IN_PROGRESS',
        notes: 'Perfect match for beauty content',
      },
    });
    console.log('✅ Created sample order: Emma + Glossier campaign');
  }

  console.log('\n🎉 Production database seeding completed!');
  console.log('\n📝 Login Credentials:');
  console.log('   📧 Email: admin@demo.com');
  console.log('   🔑 Password: demo123456');
  console.log('\n✅ Simple authentication ready!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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

  // Find existing users or create demo user
  let users = await prisma.user.findMany();
  let user;
  
  if (users.length > 0) {
    user = users[0];
    
    // Set user role to ADMIN if not set
    if (!user.role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      console.log('✅ Updated user role to ADMIN');
    }
  } else {
    // Check if demo user already exists
    user = await prisma.user.findUnique({
      where: { email: 'admin@ugc-agency.com' },
    });

    if (!user) {
      // Create demo user with Better Auth compatible fields
      user = await prisma.user.create({
        data: {
          email: 'admin@ugc-agency.com',
          name: 'Demo Admin',
          role: 'ADMIN',
          emailVerified: true,
          // Note: Password will need to be set through Better Auth registration
          // This creates a user record that can be updated when they first register
        },
      });
      console.log('✅ Created demo user:', user.email);
      console.log('⚠️  Please register with email admin@ugc-agency.com to set password');
    } else {
      console.log('✅ Found existing demo user:', user.email);
    }
  }

  // Add user to organization (if not already a member)
  const existingMember = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
  });

  if (!existingMember) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
      },
    });
    console.log('✅ Added user to organization');
  } else {
    console.log('✅ User already member of organization');
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
  } else {
    console.log('✅ Found existing Nike client');
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
  } else {
    console.log('✅ Found existing Glossier client');
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
        createdById: user.id,
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
  } else {
    console.log('✅ Found existing Nike campaign');
  }

  let campaign2 = await prisma.campaign.findFirst({
    where: { title: 'Glossier Summer Glow', organizationId: org.id },
  });

  if (!campaign2) {
    campaign2 = await prisma.campaign.create({
      data: {
        organizationId: org.id,
        clientId: client2.id,
        createdById: user.id,
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
  } else {
    console.log('✅ Found existing Glossier campaign');
  }

  // Note: Demo user ready for login
  console.log('🎉 Demo setup complete!');
  console.log('📧 Demo Login: admin@ugc-agency.com');
  console.log('🔑 Demo Password: demo123456');
  console.log('⚠️  Register with this email first to set the password in Better Auth');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
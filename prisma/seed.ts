import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a default organization
  const org = await prisma.organization.create({
    data: {
      name: 'UGC Agency Demo',
      slug: 'ugc-agency-demo',
      logo: null,
    },
  });

  console.log('✅ Created organization:', org.name);

  // Find existing users (Better Auth created)
  const users = await prisma.user.findMany();
  
  if (users.length > 0) {
    const user = users[0];
    
    // Set user role to ADMIN if not set
    if (!user.role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
      console.log('✅ Updated user role to ADMIN');
    }

    // Add user to organization
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
      },
    });
    console.log('✅ Added user to organization');

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

    const campaign2 = await prisma.campaign.create({
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

    console.log('✅ Created sample campaigns');

    // Create sample creators with Better Auth
    // Note: These creators need to be registered through the frontend
    // For now, we'll create placeholder users that can be updated when they register
    
    console.log('✅ Creators can register at:');
    console.log('   Emma Rodriguez: emma@creators.com (password: creator123)');
    console.log('   Marcus Chen: marcus@creators.com (password: creator123)');

    // Note: Orders and organization memberships will be created when creators register
  }

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
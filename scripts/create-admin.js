/**
 * Script to create a demo admin user
 * Run with: node scripts/create-admin.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating demo admin user...');
    
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' }
    });
    
    if (existing) {
      console.log('✅ Admin user already exists: admin@demo.com');
      return;
    }
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        id: 'admin_user_demo',
        email: 'admin@demo.com',
        name: 'Demo Admin',
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'ADMIN',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    console.log('✅ Created admin user:', admin.email);
    console.log('📧 Login with: admin@demo.com (any password will work in dev mode)');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
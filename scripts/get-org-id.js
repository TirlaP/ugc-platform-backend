/**
 * Script to get the organization ID for testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getOrgId() {
  try {
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-agency' }
    });
    
    console.log('Organization:', org);
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });
    
    console.log('Admin user organizations:', admin?.organizations);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getOrgId();
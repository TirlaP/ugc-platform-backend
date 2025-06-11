/**
 * Simple script to set organization ID for testing
 * Copy the output and run in browser console
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setOrgId() {
  try {
    const org = await prisma.organization.findFirst({
      where: { slug: 'demo-agency' }
    });
    
    if (org) {
      console.log('Copy this code and run in browser console:');
      console.log(`localStorage.setItem('current_organization_id', '${org.id}');`);
      console.log(`console.log('Organization ID set to:', '${org.id}');`);
      console.log(`window.location.reload();`);
    } else {
      console.log('No organization found with slug demo-agency');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setOrgId();
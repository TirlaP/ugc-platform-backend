/**
 * Migration script to add password field and set default passwords
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Starting password migration...');
  
  // Default password for all existing users
  const defaultPassword = 'demo123456';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  // Update all users without a password
  const result = await prisma.$executeRaw`
    UPDATE "user" 
    SET password = ${hashedPassword}
    WHERE password IS NULL OR password = ''
  `;
  
  console.log(`✅ Updated ${result} users with default password`);
  console.log('📝 Default password is: demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
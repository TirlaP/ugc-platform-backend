import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);

async function setupDatabase() {
  console.log('🗃️ Setting up database...');
  
  try {
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    await execAsync('npx prisma generate');
    
    // Push schema to create tables (accept data loss for existing non-UGC data)
    console.log('📄 Creating database tables...');
    await execAsync('npx prisma db push --accept-data-loss');
    
    // Check if database needs seeding
    const prisma = new PrismaClient();
    try {
      const orgCount = await prisma.organization.count();
      
      if (orgCount === 0) {
        console.log('🌱 Database is empty, seeding with demo data...');
        await execAsync('npm run db:seed:prod');
        console.log('✅ Database seeded successfully!');
      } else {
        console.log('✅ Database already has data, skipping seed');
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.log('🌱 Database needs seeding...');
      await execAsync('npm run db:seed:prod');
      console.log('✅ Database seeded successfully!');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

async function startServer() {
  console.log('🚀 Starting UGC Platform Backend...');
  
  // Setup database first
  await setupDatabase();
  
  // Start the server
  console.log('🎉 Starting server...');
  const { spawn } = await import('child_process');
  const server = spawn('node', ['dist/index.js'], { stdio: 'inherit' });
  
  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
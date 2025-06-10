#!/bin/bash

echo "🚀 Starting UGC Platform Backend..."

# Check if database tables exist, if not create them
echo "🗃️ Checking database setup..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database (creates tables if they don't exist)
echo "📄 Setting up database schema..."
npx prisma db push

# Check if we need to seed the database
echo "🌱 Checking if database needs seeding..."
node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.organization.count().then(count => {
  if (count === 0) {
    console.log('Database is empty, running seed...');
    process.exit(1);
  } else {
    console.log('Database already has data, skipping seed');
    process.exit(0);
  }
}).catch(() => {
  console.log('Database needs setup, running seed...');
  process.exit(1);
});
" && echo "✅ Database already seeded" || (echo "🌱 Seeding database..." && npm run db:seed:prod)

echo "🎉 Database setup complete!"

# Start the server
echo "🚀 Starting server..."
node dist/index.js
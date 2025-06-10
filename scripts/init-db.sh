#!/bin/bash

echo "🗃️  Initializing database..."

# Push schema to create all tables
echo "📄 Creating database schema..."
npx prisma db push

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Seed the database with demo data
echo "🌱 Seeding database with demo data..."
npm run db:seed

echo "✅ Database initialization complete!"
echo "🎉 Your UGC platform is ready to use!"
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Allow requests from frontend
  trustedOrigins: [
    process.env['FRONTEND_URL'] || 'http://localhost:5173',
    'https://ugc-platform.netlify.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ],

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
  },

  // Social providers
  socialProviders: {
    github: {
      clientId: process.env['GITHUB_CLIENT_ID'] || '',
      clientSecret: process.env['GITHUB_CLIENT_SECRET'] || '',
    },
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] || '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
    },
  },

  // User configuration - simple approach
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'CLIENT',
      },
      phone: {
        type: 'string',
      },
      bio: {
        type: 'string',
      },
      banned: {
        type: 'boolean',
        defaultValue: false,
      },
      banReason: {
        type: 'string',
      },
      banExpires: {
        type: 'date',
      },
      firstName: {
        type: 'string',
      },
      lastName: {
        type: 'string',
      },
    },
  },

  // Session configuration - keeping minimal for now
  session: {},
});

export default auth;

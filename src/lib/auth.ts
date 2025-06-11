/**
 * Simple JWT-based authentication
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const auth = {
  /**
   * Generate JWT token
   */
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, _password: string) {
    // For now, find user by email and create session
    // In production, integrate with Better Auth
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // TODO: Integrate with Better Auth for actual password verification
    // For now, just check if user exists
    
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'CLIENT',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },

  /**
   * Sign up new user
   */
  async signUp(userData: {
    email: string;
    password: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    role: string;
    organizationName?: string | undefined;
  }) {
    const exists = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (exists) {
      throw new Error('User already exists');
    }

    // TODO: Store password in Better Auth accounts table
    // For now, just create user without password

    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        role: userData.role,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'CLIENT',
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    };
  },
};

export default auth;
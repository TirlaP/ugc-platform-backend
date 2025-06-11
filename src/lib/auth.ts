/**
 * Simple JWT-based authentication with bcrypt password hashing
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

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
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Compare provided password with stored hash
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

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

    // Hash the password before storing
    const hashedPassword = await this.hashPassword(userData.password);

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        phone: userData.phone || null,
        role: userData.role,
        emailVerified: false,
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

  /**
   * Get user by ID (for token validation)
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
    };
  },
};

export default auth;
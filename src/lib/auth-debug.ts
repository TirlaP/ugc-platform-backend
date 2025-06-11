/**
 * Simple JWT-based authentication with debug logging
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    console.log('🔒 Hashing password...');
    return bcrypt.hash(password, 10);
  },

  /**
   * Verify password with debug logging
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    console.log('🔍 Verifying password...');
    console.log('Password provided:', password ? 'YES' : 'NO');
    console.log('Hash provided:', hash ? 'YES' : 'NO');
    
    if (!password) {
      console.error('❌ Password is undefined/empty');
      throw new Error('Password is required');
    }
    
    if (!hash) {
      console.error('❌ Hash is undefined/empty');
      throw new Error('User password hash not found');
    }
    
    try {
      const result = await bcrypt.compare(password, hash);
      console.log('🔐 Password verification result:', result);
      return result;
    } catch (error) {
      console.error('❌ bcrypt.compare error:', error);
      throw error;
    }
  },

  /**
   * Generate JWT token
   */
  generateToken(payload: JWTPayload): string {
    console.log('🎫 Generating JWT token for:', payload.email);
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
   * Sign in with email and password - debug version
   */
  async signIn(email: string, password: string) {
    console.log('🔑 Sign in attempt for:', email);
    
    try {
      console.log('📊 Querying database for user...');
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        console.log('❌ User not found in database');
        throw new Error('Invalid credentials');
      }

      console.log('✅ User found:', {
        id: user.id,
        email: user.email,
        hasPassword: user.password ? 'YES' : 'NO',
        passwordLength: user.password ? user.password.length : 0
      });

      console.log('🔐 Verifying password...');
      const isValid = await this.verifyPassword(password, user.password);
      
      if (!isValid) {
        console.log('❌ Password verification failed');
        throw new Error('Invalid credentials');
      }

      console.log('✅ Password verified successfully');
      console.log('🎫 Generating token...');
      
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role || 'CLIENT',
      });

      console.log('✅ Sign in successful');
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  },

  /**
   * Sign up new user
   */
  async signUp(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    const { email, password, name, role } = userData;
    console.log('📝 Sign up attempt for:', email);
    
    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      console.log('❌ User already exists');
      throw new Error('User already exists');
    }

    console.log('🔒 Hashing password...');
    const hashedPassword = await this.hashPassword(password);

    console.log('👤 Creating user in database...');
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
        emailVerified: false,
      },
    });

    console.log('✅ User created successfully');
    console.log('🎫 Generating token...');
    
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || 'CLIENT',
    });

    console.log('✅ Sign up successful');

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
};

export default auth;
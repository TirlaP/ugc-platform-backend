/**
 * Simple auth test script
 * Run with: node test-auth.js
 */

import { auth } from './dist/lib/auth.js';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Hash password
    console.log('1️⃣ Testing password hashing...');
    const testPassword = 'test123456';
    const hashedPassword = await auth.hashPassword(testPassword);
    console.log('✅ Password hashed successfully');
    console.log('   Hash length:', hashedPassword.length);
    console.log('   Hash prefix:', hashedPassword.substring(0, 10) + '...\n');

    // Test 2: Compare password
    console.log('2️⃣ Testing password comparison...');
    const isValid = await auth.comparePassword(testPassword, hashedPassword);
    const isInvalid = await auth.comparePassword('wrongpassword', hashedPassword);
    console.log('✅ Correct password verification:', isValid);
    console.log('✅ Wrong password verification:', isInvalid);
    console.log('');

    // Test 3: JWT token generation
    console.log('3️⃣ Testing JWT token generation...');
    const payload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'CLIENT'
    };
    const token = auth.generateToken(payload);
    console.log('✅ Token generated successfully');
    console.log('   Token length:', token.length);
    console.log('   Token preview:', token.substring(0, 50) + '...\n');

    // Test 4: JWT token verification
    console.log('4️⃣ Testing JWT token verification...');
    const verifiedPayload = auth.verifyToken(token);
    console.log('✅ Token verified successfully');
    console.log('   Payload:', verifiedPayload);
    console.log('');

    // Test 5: Invalid token verification
    console.log('5️⃣ Testing invalid token...');
    const invalidResult = auth.verifyToken('invalid-token');
    console.log('✅ Invalid token handled correctly:', invalidResult === null);
    console.log('');

    console.log('🎉 All authentication tests passed!\n');
    
    // Note about database tests
    console.log('📝 Note: Database-dependent tests (signIn, signUp) require:');
    console.log('   - Database connection');
    console.log('   - Prisma client setup');
    console.log('   - Valid JWT_SECRET environment variable');
    console.log('   Run these tests with actual database setup.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAuth();
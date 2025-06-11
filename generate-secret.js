// Generate a secure random secret for Better Auth
import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');
console.log('BETTER_AUTH_SECRET=' + secret);
console.log('\nAdd this to your Render environment variables:');
console.log('Variable: BETTER_AUTH_SECRET');
console.log('Value: ' + secret);
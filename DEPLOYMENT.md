# UGC Platform Backend - Deployment Guide

## Render Deployment Setup

### 1. Database Setup
1. Go to Render Dashboard → Create New → PostgreSQL
2. Choose a name (e.g., `ugc-platform-db`)
3. Note the connection details provided

### 2. Backend Service Setup
1. Go to Render Dashboard → Create New → Web Service
2. Connect your GitHub repository: `https://github.com/TirlaP/ugc-platform-backend.git`
3. Configure the service:
   - **Name**: `ugc-platform-backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build && npm run db:generate`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier (or upgrade as needed)

### 3. Environment Variables
Set these in Render's Environment Variables section:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<your-render-postgres-url>
BETTER_AUTH_SECRET=<generate-a-secure-random-string>
BETTER_AUTH_URL=https://your-backend-service.onrender.com
FRONTEND_URL=https://your-frontend.netlify.app
GITHUB_CLIENT_ID=<your-github-oauth-client-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-client-secret>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

### 4. Deploy Script
Add this to package.json scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

### 5. OAuth Setup
1. **GitHub OAuth**:
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth app
   - Authorization callback URL: `https://your-backend.onrender.com/api/auth/callback/github`

2. **Google OAuth**:
   - Go to Google Cloud Console
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Authorized redirect URI: `https://your-backend.onrender.com/api/auth/callback/google`

### 6. Database Migration
After first deployment, run migrations:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are in package.json
2. **Database connection fails**: Verify DATABASE_URL format
3. **CORS errors**: Ensure FRONTEND_URL matches your Netlify domain

### Logs:
Check Render logs for deployment and runtime issues.
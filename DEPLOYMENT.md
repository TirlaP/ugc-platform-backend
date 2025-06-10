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
   - **Build Command**: `npm install && npm run build && npm run db:generate && npx prisma migrate deploy`
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

### 6. Database Setup
After first deployment, connect to your Render service and run:

```bash
# Deploy schema and run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed with demo data (IMPORTANT: Run this!)
npm run db:seed
```

**What the seed creates:**
- Demo organization: "UGC Agency Demo"
- 2 sample clients (Nike, Glossier)
- 2 sample campaigns
- Sets up your first user as ADMIN
- Creates organization membership

**First Login:**
1. Register through the frontend first
2. The seed will automatically promote your first user to ADMIN
3. You'll have access to all demo data

## Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are in package.json
2. **Database connection fails**: Verify DATABASE_URL format
3. **CORS errors**: Ensure FRONTEND_URL matches your Netlify domain

### Logs:
Check Render logs for deployment and runtime issues.
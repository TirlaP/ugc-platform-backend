# UGC SaaS Backend API

Backend API for the UGC Agency Management Platform built with Hono, Better Auth, and Prisma.

## Tech Stack

- **Framework**: Hono (lightweight, fast, runs on edge)
- **Authentication**: Better Auth
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Language**: TypeScript
- **Runtime**: Node.js

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and update:
- `DATABASE_URL` - Your PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Generate a secure secret key
- OAuth credentials if using social login

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. (Optional) Seed the database:
```bash
npm run db:seed
```

This creates test users and sample data:
- Admin: admin@demo.com
- Staff: staff@demo.com  
- Creators: sarah@creator.com, mike@creator.com, emma@creator.com

### Development

Start the development server:
```bash
npm run dev
```

The API will be available at http://localhost:3000

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create a new migration
npm run db:migrate

# Push schema changes (development only)
npm run db:push
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-up` - Register new user
- `POST /api/auth/sign-in` - Login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### Campaigns
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/assign` - Assign creator

### Clients
- `GET /api/clients` - List clients (Admin/Staff only)
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create client
- `PATCH /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Archive client

### Creators
- `GET /api/creators` - List creators
- `GET /api/creators/:id` - Get creator profile
- `PATCH /api/creators/:id` - Update creator profile
- `GET /api/creators/:id/stats` - Get creator statistics

### Media/Content
- `GET /api/media/campaign/:id` - Get campaign media
- `GET /api/media/:id` - Get media details
- `POST /api/media/upload` - Upload media
- `PATCH /api/media/:id` - Update media status
- `DELETE /api/media/:id` - Archive media

### Organizations
- `GET /api/organizations/current` - Get current organization
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id/members` - List members
- `POST /api/organizations/:id/invite` - Invite member

## Authentication

The API uses Better Auth for authentication with support for:
- Email/password authentication
- Social login (Google, GitHub)
- Role-based access control (ADMIN, STAFF, CREATOR, CLIENT)
- Multi-organization support

All API endpoints except `/api/auth/*` require authentication.

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error message",
  "details": {} // Optional additional details
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development Notes

- Uses ES modules (`"type": "module"` in package.json)
- TypeScript configured for Node.js
- Middleware for auth and role checking
- Request validation with Zod
- CORS enabled for frontend development

## Production

For production deployment:

1. Build the TypeScript:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

Consider using PM2 or similar for process management.

## License

Private - All rights reserved
# UGC Platform Backend

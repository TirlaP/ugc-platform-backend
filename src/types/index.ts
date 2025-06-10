import type { User } from '@prisma/client';

// Extended user type that includes organizationId for API context
export interface UserWithOrganization extends User {
  organizationId: string | null;
}

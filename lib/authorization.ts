import { Role } from "@prisma/client";

import prisma from "@/lib/db";

type SessionLike = {
  user?: {
    id?: string | null;
  };
} | null;

const ROLE_WEIGHT: Record<Role, number> = {
  VIEWER: 1,
  ADMIN: 2,
  OWNER: 3,
};

async function promoteLegacySoleTenantUser(userId: string, tenantId: string) {
  const [elevatedUsers, tenantUsers] = await Promise.all([
    prisma.user.count({
      where: {
        tenantId,
        role: {
          in: [Role.ADMIN, Role.OWNER],
        },
      },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
      take: 2,
    }),
  ]);

  if (elevatedUsers > 0) {
    return null;
  }

  if (tenantUsers.length !== 1 || tenantUsers[0]?.id !== userId) {
    return null;
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: Role.OWNER },
    select: {
      id: true,
      tenantId: true,
      role: true,
    },
  });
}

export function hasRequiredRole(currentRole: Role, minimumRole: Role) {
  return ROLE_WEIGHT[currentRole] >= ROLE_WEIGHT[minimumRole];
}

export async function requireTenantRole(session: SessionLike, minimumRole: Role) {
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      role: true,
    },
  });

  if (!user?.tenantId) {
    throw new Error("Unauthorized");
  }

  let resolvedUser = user;
  const tenantId: string = user.tenantId;

  if (!hasRequiredRole(resolvedUser.role, minimumRole)) {
    const promotedUser = await promoteLegacySoleTenantUser(resolvedUser.id, tenantId);
    if (promotedUser) {
      resolvedUser = promotedUser;
    }
  }

  if (!hasRequiredRole(resolvedUser.role, minimumRole)) {
    throw new Error("Forbidden");
  }

  return resolvedUser;
}

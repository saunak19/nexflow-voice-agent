import prisma from "@/lib/db";

type SessionLike = {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    tenantId?: string | null;
  };
} | null;

function deriveTenantName(name?: string | null, email?: string | null) {
  if (name?.trim()) return `${name.trim()}'s Workspace`;
  if (email?.trim()) return `${email.split("@")[0]}'s Workspace`;
  return "NexFlow Workspace";
}

export async function getCurrentTenantId(session: SessionLike) {
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      tenantId: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.tenantId) {
    return user.tenantId;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: deriveTenantName(user.name, user.email),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tenantId: tenant.id,
    },
  });

  return tenant.id;
}

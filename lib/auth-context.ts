import { UserRole, UserStatus } from "@prisma/client";
import { getSessionOrMock } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type AuthContext = {
  session: Awaited<ReturnType<typeof getSessionOrMock>>;
  user: {
    id: string;
    email: string | null;
    role: UserRole;
    status: UserStatus;
    name: string | null;
    onboardingCompleted: boolean;
  } | null;
};

function isOnboardingCompleted(preferences: unknown) {
  if (!preferences || typeof preferences !== "object") return false;
  const prefs = preferences as Record<string, unknown>;
  return prefs.onboardingCompleted === true;
}

export async function getAuthContext(): Promise<AuthContext> {
  const session = await getSessionOrMock();
  if (!session?.user?.id) {
    return { session, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      name: true,
      preferences: true,
    },
  });

  if (!user) {
    return { session, user: null };
  }

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name,
      onboardingCompleted: isOnboardingCompleted(user.preferences),
    },
  };
}

export function isActiveUser(ctx: AuthContext) {
  return Boolean(ctx.user && ctx.user.status === UserStatus.ACTIVE);
}

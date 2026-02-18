import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/config";
import { UserRole, UserStatus } from "@prisma/client";

async function refreshGoogleAccessToken(token: Record<string, unknown>) {
  const refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : "";
  if (!refreshToken) return token;

  try {
    const body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!response.ok || !data.access_token) {
      return { ...token, error: data.error ?? "RefreshAccessTokenError" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
      refreshToken: data.refresh_token ?? refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user, trigger, session }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000;
      }

      if (account?.refresh_token) {
        token.refreshToken = account.refresh_token;
      }

      // Avoid Prisma calls here because this callback is also executed in Edge middleware.
      if (user) {
        token.role = (user as any).role ?? token.role ?? UserRole.CANDIDATE;
        token.status = (user as any).status ?? token.status ?? UserStatus.ACTIVE;
      }

      if (trigger === "update" && session?.user) {
        token.role = (session.user as any).role ?? token.role;
        token.status = (session.user as any).status ?? token.status;
      }

      if (!token.role) token.role = UserRole.CANDIDATE;
      if (!token.status) token.status = UserStatus.ACTIVE;

      const expiresAt = typeof token.accessTokenExpires === "number" ? token.accessTokenExpires : 0;
      if (token.accessToken && Date.now() < expiresAt - 60_000) {
        return token;
      }

      if (!token.refreshToken) return token;
      return refreshGoogleAccessToken(token as Record<string, unknown>);
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && token.role) {
        session.user.role = token.role as string;
      }
      if (session.user && token.status) {
        session.user.status = token.status as string;
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
});

export async function getSessionOrMock() {
  if (isDemoMode()) {
    await prisma.user.upsert({
      where: { id: "dev-user" },
      update: {},
      create: {
        id: "dev-user",
        email: "dev@local",
        name: "Dev User",
        role: UserRole.ADMIN,
        status: "ACTIVE",
      },
    });

    return {
      user: {
        id: "dev-user",
        email: "dev@local",
        role: UserRole.ADMIN,
        status: "ACTIVE",
        name: "Dev User",
      },
      accessToken: process.env.DEV_GMAIL_ACCESS_TOKEN,
    };
  }

  return auth();
}

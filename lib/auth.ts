import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { isDemoMode } from "@/lib/config";
import { UserRole, UserStatus } from "@prisma/client";

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
      return token;
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

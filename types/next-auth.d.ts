import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      status?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

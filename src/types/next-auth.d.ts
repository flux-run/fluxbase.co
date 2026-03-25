import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    flux_token?: string;
    org_id?: string;
  }

  interface User {
    flux_token?: string;
    org_id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    flux_token?: string;
    org_id?: string;
  }
}

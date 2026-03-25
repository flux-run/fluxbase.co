import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
const handler = NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email || !account) return false;

      try {
        // Induction: Sync with Flux custom backend
        // Note: Using 127.0.0.1 to avoid IPv6 resolution issues on some local setups
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
        
        const res = await fetch(`${apiUrl}/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            provider: account.provider,
            provider_id: account.providerAccountId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error(`[NextAuth] Backend induction failed: ${res.status}`, errorData);
          return false;
        }
        
        const data = await res.json();
        // Attach backend metadata to user object for the JWT callback
        user.flux_token = data.token;
        user.org_id = data.org_id;
        return true;
      } catch (error) {
        console.error("[NextAuth] Sign-in induction error:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.flux_token = user.flux_token;
        token.org_id = user.org_id;
      }
      return token;
    },
    async session({ session, token }) {
      session.flux_token = token.flux_token;
      session.org_id = token.org_id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

export { handler as GET, handler as POST };

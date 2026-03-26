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
    async signIn({ user, account }) {
      if (!user.email || !account) return false;
      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, perform the induction to the Control Plane
      if (user && account) {
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
          console.log(
            `[NextAuth] Performing induction for ${user.email} at ${apiUrl}/auth/oauth`,
          );

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

          if (res.ok) {
            const data = await res.json();
            console.log(
              `[NextAuth] Induction successful, saving token for ${user.email}`,
            );
            token.flux_token = data.token;
            token.org_id = data.org_id;
          } else {
            const errorText = await res.text().catch(() => "No error body");
            console.error(
              `[NextAuth] Induction failed: Status ${res.status}. Body: ${errorText}`,
            );
          }
        } catch (error) {
          console.error("[NextAuth] Induction exception:", error);
        }
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

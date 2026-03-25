import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

function AuthSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.flux_token) {
      localStorage.setItem("flux_token", session.flux_token);
      if (session.user) {
        localStorage.setItem("flux_user", JSON.stringify(session.user));
      }
      if (session.org_id) {
        localStorage.setItem("current_org_id", session.org_id);
      }
    }
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync />
      {children}
    </SessionProvider>
  );
}

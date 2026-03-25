"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("flux_token", res.token);
      localStorage.setItem("flux_user", JSON.stringify(res.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 flex items-center hover:opacity-80 transition-opacity">
        <span className="text-xl font-bold tracking-tighter text-white">flux</span>
      </Link>

      <Card className="w-full max-w-md bg-[#111] border-neutral-800 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Log in</CardTitle>
          <CardDescription className="text-neutral-500">
            Welcome back to the production observability era.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-neutral-500">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@company.com" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-neutral-800 text-white placeholder:text-neutral-700 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-neutral-500">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black border-neutral-800 text-white placeholder:text-neutral-700 h-11"
              />
            </div>
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-white text-black hover:bg-neutral-200 font-bold h-11" 
              disabled={loading}
            >
              {loading ? "Logging in..." : "Continue →"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white hover:underline font-medium ml-1">Sign up</Link>
        </CardFooter>
      </Card>
    </div>
  );
}

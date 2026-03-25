"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { FluxLogo } from "@/components/FluxLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
      });
      localStorage.setItem("flux_token", res.token);
      localStorage.setItem("current_org_id", res.org_id);
      localStorage.setItem("flux_user", JSON.stringify(res.user));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
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
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Create an account</CardTitle>
          <CardDescription className="text-neutral-500">
            Enter your email to join the production observability era.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-neutral-500">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black border-neutral-800 text-white placeholder:text-neutral-700 h-11"
              />
            </div>
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
              {loading ? "Creating account..." : "Continue →"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-neutral-600">
            By clicking continue, you agree to our <Link href="/docs/terms" className="text-blue-500 hover:underline">Terms of Service</Link> and <Link href="/docs/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link>.
          </p>
          <div className="text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-medium">Log in</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

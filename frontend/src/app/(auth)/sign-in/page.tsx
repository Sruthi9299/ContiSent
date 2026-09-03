"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    try {
      const data = new URLSearchParams();
      data.append("username", email);
      data.append("password", password);
      
      const res = await fetch(`${API_BASE_URL}/login/access-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      });
      
      if (!res.ok) {
        let errorMessage = "Invalid credentials";
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' ? errorData.detail : "Invalid credentials";
          }
        } catch (e) {
          errorMessage = `Server error: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      login(result.access_token);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          Welcome back
        </h2>
        <p className="text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            Sign up for free
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base font-medium transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
            {isLoading ? "Signing in..." : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/config";

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reqs = {
    length: password.length >= 3,
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (!reqs.length) {
      setError("Password must be at least 3 characters");
      setIsLoading(false);
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    
    try {
      // 1. Register User
      const regRes = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username: name,
          password,
          role: "developer"
        })
      });
      
      if (!regRes.ok) {
        let errorMessage = "Registration failed";
        try {
          const errorData = await regRes.json();
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => err.msg).join(", ");
            } else {
              errorMessage = errorData.detail;
            }
          }
        } catch (e) {
          // Fallback if response is not JSON (e.g. 500 error)
          errorMessage = `Server error: ${regRes.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // 2. Automatically log them in
      const data = new URLSearchParams();
      data.append("username", email);
      data.append("password", password);
      
      const loginRes = await fetch(`${API_BASE_URL}/login/access-token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data,
      });
      
      if (!loginRes.ok) {
        throw new Error("Login failed after registration");
      }
      
      const result = await loginRes.json();
      login(result.access_token);
    } catch (err: any) {
      setError(err.message || "Failed to sign up. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          Create an account
        </h2>
        <p className="text-slate-400">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
          </div>

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
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
            

          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base font-medium transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] mt-2">
            {isLoading ? "Creating account..." : <>Create account <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </>
  );
}

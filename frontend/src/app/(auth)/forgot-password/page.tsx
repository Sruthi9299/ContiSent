"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const email = (e.currentTarget as HTMLFormElement).email.value;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to send reset link");
      }
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <>
      <div className="mb-10">
        <Link href="/sign-in" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Link>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          Forgot Password
        </h2>
        <p className="text-slate-400">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8">
        {isSuccess && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md text-green-400 mb-6 flex items-start gap-3">
            <Check className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm">A password reset link has been sent to your email.</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 mb-6 flex items-start gap-3">
            <p className="text-sm">{error}</p>
          </div>
        )}
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

          <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base font-medium transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
            {isLoading ? "Sending..." : <>Send Reset Link <Send className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, KeyRound, Check } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    const form = e.currentTarget as HTMLFormElement;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Failed to reset password");
      }
      
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/sign-in");
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="mt-8">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 mb-6">
          <p className="text-sm">No reset token found. Please use the link from your email.</p>
        </div>
        <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {isSuccess && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md text-green-400 mb-6 flex items-start gap-3">
          <Check className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="text-sm">Password updated successfully! Redirecting to sign in...</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 mb-6 flex items-start gap-3">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {!isSuccess && (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-slate-300">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-slate-300">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="bg-slate-900/50 border-slate-800 text-white focus:border-blue-500 focus:ring-blue-500/20 h-12"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base font-medium transition-all shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
            {isLoading ? "Updating..." : <>Update Password <KeyRound className="ml-2 h-4 w-4" /></>}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-10">
        <Link href="/sign-in" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to sign in
        </Link>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
          Reset Password
        </h2>
        <p className="text-slate-400">
          Enter your new password below to reset your account.
        </p>
      </div>

      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}

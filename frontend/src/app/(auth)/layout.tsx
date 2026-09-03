import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950 selection:bg-blue-500/30">
      {/* Form Side */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-slate-950 relative z-10">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link href="/" className="flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Contisent
            </span>
          </Link>
          {children}
        </div>
      </div>
      
      {/* Decorative Side */}
      <div className="relative hidden w-0 flex-1 lg:block overflow-hidden bg-black">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 bg-[url('/secops_defense.jpg')] bg-cover bg-center opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-950/90 to-slate-950/95" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl opacity-50" />
        
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg space-y-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
              <span className="text-xs font-medium text-blue-300">Enterprise Grade Security</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight leading-tight">
              Secure your containers from build to runtime.
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Automate vulnerability scanning, enforce security policies, and monitor runtime threats with the industry's most advanced Contisent Platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

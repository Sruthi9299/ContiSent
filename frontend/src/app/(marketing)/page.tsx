"use client";

import { useEffect, useState, useMemo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, Lock, BarChart3, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine: Engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesOptions = useMemo(() => ({
    background: {
      color: {
        value: "transparent",
      },
    },
    fpsLimit: 120,
    interactivity: {
      events: {
        onClick: {
          enable: true,
          mode: "push",
        },
        onHover: {
          enable: true,
          mode: "repulse",
        },
      },
      modes: {
        push: {
          quantity: 4,
        },
        repulse: {
          distance: 100,
          duration: 0.4,
        },
      },
    },
    particles: {
      color: {
        value: "#3b82f6",
      },
      links: {
        color: "#60a5fa",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        direction: "none" as const,
        enable: true,
        outModes: {
          default: "bounce" as const,
        },
        random: false,
        speed: 1,
        straight: false,
      },
      number: {
        density: {
          enable: true,
        },
        value: 100,
      },
      opacity: {
        value: 0.3,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 1, max: 3 },
      },
    },
    detectRetina: true,
  }), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 relative">
      {/* Background Animated Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 z-0 pointer-events-none" />
        
        {/* Particles */}
        {init && (
          <div className="absolute inset-0 z-10">
            <Particles
              id="tsparticles"
              options={particlesOptions}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">Contisent</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/sign-up"
              className="inline-flex items-center justify-center whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700 rounded-full px-6 h-9 text-sm font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-32 sm:pt-32 lg:pt-40">
        <div className="mx-auto max-w-3xl text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            <span className="text-xs font-medium text-blue-300">Introducing Contisent V2.0</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Secure your containers with zero friction.
          </h1>

          <p className="text-lg leading-8 text-slate-400 mb-10 max-w-2xl mx-auto">
            Automated image scanning, policy enforcement, and vulnerability management directly integrated into your deployment pipeline.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/sign-up" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-blue-600 hover:bg-blue-500 text-white px-8 h-14 text-base font-medium transition-all shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] border-0"
            >
              Start for free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/dashboard"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 h-14 text-base font-medium transition-colors"
            >
              View Dashboard <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          {[
            {
              icon: Zap,
              title: "Real-time Scanning",
              description: "Detect vulnerabilities the second an image is built, before it ever reaches production."
            },
            {
              icon: Lock,
              title: "Policy Enforcement",
              description: "Automatically block non-compliant images from being deployed using strict gatekeeper rules."
            },
            {
              icon: BarChart3,
              title: "Comprehensive Analytics",
              description: "Visualize your security posture over time and generate compliance reports instantly."
            }
          ].map((feature, idx) => (
            <div key={idx} className="relative group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <feature.icon className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

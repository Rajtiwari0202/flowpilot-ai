"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { tokens } from "@/design-system";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-200 border-b select-none ${
        isScrolled
          ? "bg-white/95 dark:bg-black/95 backdrop-blur-sm border-slate-200 dark:border-[#171717] shadow-sm"
          : "bg-transparent border-transparent"
      }`}
      aria-label="Main Navigation"
    >
      <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 rounded-md">
          <div className="grid size-8 place-items-center rounded-lg bg-orange-600 dark:bg-orange-500 text-white">
            <Bot size={17} aria-hidden="true" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">ACE</span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition">How It Works</a>
          <a href="#security" className="hover:text-slate-900 dark:hover:text-white transition">Security</a>
          <span className="text-slate-400 dark:text-zinc-555 cursor-not-allowed select-none">
            Pricing <span className="text-[10px] bg-slate-100 dark:bg-[#171717] text-slate-500 dark:text-zinc-400 rounded px-1.5 py-0.5 ml-1">Soon</span>
          </span>
        </div>

        {/* Right: CTA Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-bold text-slate-650 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="primary-button text-xs py-2 px-3.5"
            aria-label="Start free workspace"
          >
            Start Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

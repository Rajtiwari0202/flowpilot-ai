"use client";

import Link from "next/link";
import { ShieldCheck, PlugZap } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 py-16 lg:py-24 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Column: Heading and CTAs */}
        <div className="lg:col-span-6 text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.1]">
            Turn emails into workflows automatically.
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl">
            Connect Gmail, capture leads, draft replies, request approvals, and keep your team moving — all from one workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="primary-button text-base px-6 py-3"
              aria-label="Get started for free"
            >
              Start Free
            </Link>
            <a
              href="#product-preview"
              className="secondary-button text-base px-6 py-3"
              aria-label="View product demonstration"
            >
              View Demo
            </a>
          </div>
        </div>

        {/* Right Column: Compact CSS UI Mockup */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 p-5 shadow-xl flex flex-col gap-4 select-none">
            {/* Connection Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlugZap size={15} className="text-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Gmail connection</span>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Active</span>
            </div>

            {/* Active Workflow Card */}
            <div className="border border-slate-150 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Workflow Active</span>
                <span className="size-2 rounded-full bg-emerald-500"></span>
              </div>
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Lead Follow-up Pipeline</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Automating responses for rajtiwari16916@gmail.com</p>
            </div>

            {/* Lead Card Item */}
            <div className="border border-slate-150 dark:border-slate-800 rounded-lg p-3 flex items-center justify-between bg-white dark:bg-slate-950 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">SC</div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Sarah Chen</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">sarah@example.com</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[9px] font-bold">New lead</span>
            </div>

            {/* Approval Preview Card */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Pending Approval</span>
                </div>
                <span className="text-[9px] text-slate-400">2m ago</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 font-mono line-clamp-2">
                Subject: Re: Inquiry - Hi Sarah, thanks for reaching out. I&apos;ve prepared...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

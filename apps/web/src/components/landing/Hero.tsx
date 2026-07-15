"use client";

import Link from "next/link";
import { PlugZap, Clock3 } from "lucide-react";
import { tokens } from "../../design-system/tokens";

export function Hero() {
  return (
    <section className={`${tokens.colors.bg} border-b ${tokens.colors.border} py-16 lg:py-24 px-6 lg:px-8`}>
      <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Column: Heading, Badge, CTAs & Features */}
        <div className="lg:col-span-6 text-left flex flex-col items-start">
          {/* Small Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 mb-6 border border-blue-100 dark:border-blue-900/50">
            AI-powered workflow automation
          </span>

          {/* Headline (56px-64px on Desktop) */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl leading-[1.05] max-w-xl">
            Turn emails into revenue-generating workflows.
          </h1>

          {/* Description (20px Subhead / 16px Body) */}
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 dark:text-slate-400 max-w-xl">
            Capture leads, draft replies, request approvals, and keep your team moving — all from one workspace.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="primary-button text-base px-6 py-3"
              aria-label="Start free account"
            >
              Start Free
            </Link>
            <a
              href="#product-preview"
              className="secondary-button text-base px-6 py-3"
              aria-label="Scroll to product dashboard preview"
            >
              Watch Demo
            </a>
          </div>

          {/* Value Propositions / Ticks */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-slate-500 dark:text-slate-450">
            <span className="flex items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400">✓</span> Google OAuth
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400">✓</span> Gmail Integration
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-blue-600 dark:text-blue-400">✓</span> Secure Encryption
            </span>
          </div>
        </div>

        {/* Right Column: Realistic Dashboard Preview Mockup */}
        <div className="lg:col-span-6 flex justify-center">
          <div className={`w-full max-w-md border ${tokens.colors.border} ${tokens.radius.card} ${tokens.colors.card} p-5 ${tokens.shadow.xl} flex flex-col gap-4 select-none`}>
            {/* Lead Inbox Preview Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PlugZap size={14} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Gmail Sync Active</span>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Connected</span>
            </div>

            {/* Workflow Card Mock */}
            <div className={`border ${tokens.colors.border} rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Workflow status</span>
                <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold">Active</span>
              </div>
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">Lead Follow-Up Pipeline</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Trigger: New Incoming Lead</p>
            </div>

            {/* Lead Inbox Feed */}
            <div className={`border ${tokens.colors.border} rounded-lg p-3 flex items-center justify-between bg-white dark:bg-slate-900 shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">SC</div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">Sarah Chen</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-450">New Lead Received</p>
                </div>
              </div>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">2m ago</span>
            </div>

            {/* Approval Queue Mock */}
            <div className={`border ${tokens.colors.border} rounded-lg p-3 bg-white dark:bg-slate-900 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock3 size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Approval Queue</span>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Draft Ready</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-850 font-mono line-clamp-2">
                Subject: Re: Quote Request - Hi Sarah, I have prepared your automated quote proposal...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

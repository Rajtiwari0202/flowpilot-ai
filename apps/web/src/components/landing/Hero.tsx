"use client";

import Link from "next/link";
import { PlugZap, Clock3, Bot, CheckCircle2 } from "lucide-react";
import { tokens } from "@/design-system";

export function Hero() {
  return (
    <section className="bg-black border-b border-[#171717] py-16 lg:py-24 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Column: Heading, Badge, CTAs & Features */}
        <div className="lg:col-span-6 text-left flex flex-col items-start">
          {/* Small Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-950/20 px-3 py-1 text-xs font-semibold text-orange-500 mb-6 border border-orange-900/30">
            Your Autonomous Chief Executor
          </span>

          {/* Headline (56px-64px on Desktop) */}
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.05] max-w-xl">
            ACE gets the work done.
          </h1>

          {/* Description (20px Subhead / 16px Body) */}
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-zinc-400 max-w-xl">
            Connect Gmail, capture leads, draft responses, request approvals, and keep your team moving from one workspace.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="primary-button text-base px-6 py-3"
              aria-label="Start free account"
            >
              Connect Gmail
            </Link>
            <a
              href="#product-preview"
              className="secondary-button text-base px-6 py-3 border-[#171717] bg-[#0A0A0A] text-zinc-300 hover:bg-[#1f1f1f]"
              aria-label="Scroll to product dashboard preview"
            >
              Watch Demo
            </a>
          </div>

          {/* Value Propositions / Ticks */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="text-orange-500">✓</span> Google OAuth
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-orange-500">✓</span> Gmail Integration
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-orange-500">✓</span> Human Approval
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-orange-500">✓</span> Audit Logs
            </span>
          </div>
        </div>

        {/* Right Column: Realistic Dashboard Preview Mockup */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md border border-[#171717] rounded-xl bg-[#0A0A0A] p-5 shadow-2xl flex flex-col gap-4 select-none">
            {/* Lead Inbox Preview Header */}
            <div className="flex items-center justify-between border-b border-[#171717] pb-3">
              <div className="flex items-center gap-2">
                <PlugZap size={14} className="text-emerald-500" />
                <span className="text-xs font-bold text-white">Gmail Sync Active</span>
              </div>
              <span className="rounded-full bg-emerald-950/40 text-emerald-400 px-2 py-0.5 text-[10px] font-bold border border-emerald-900/30">Connected</span>
            </div>

            {/* Workflow Card Mock */}
            <div className="border border-[#171717] rounded-lg p-3 bg-zinc-950/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-orange-500 uppercase">Workflow status</span>
                <span className="rounded bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold border border-emerald-900/30">Active</span>
              </div>
              <h3 className="font-bold text-xs text-white">Lead Follow-Up Pipeline</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Trigger: New Incoming Lead</p>
            </div>

            {/* Lead Inbox Feed */}
            <div className="border border-[#171717] rounded-lg p-3 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-orange-950/40 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-900/30">SC</div>
                <div>
                  <h4 className="font-bold text-xs text-white">Sarah Chen</h4>
                  <p className="text-[10px] text-zinc-450">New Lead Received</p>
                </div>
              </div>
              <span className="text-[9px] text-zinc-500">2m ago</span>
            </div>

            {/* Approval Queue Mock */}
            <div className="border border-[#171717] rounded-lg p-3 bg-zinc-950">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Clock3 size={13} className="text-zinc-400" />
                  <span className="text-[10px] font-semibold text-zinc-300">Approval Queue</span>
                </div>
                <span className="text-[9px] text-zinc-500 font-bold">Draft Ready</span>
              </div>
              <div className="text-[10px] text-zinc-400 leading-normal bg-black p-2 rounded border border-[#171717] font-mono line-clamp-2">
                Subject: Re: Quote Request - Hi Sarah, I have prepared your automated quote proposal...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

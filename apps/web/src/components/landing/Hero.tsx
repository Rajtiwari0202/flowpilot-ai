"use client";

import Link from "next/link";
import { ShieldCheck, PlugZap } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-slate-50 border-b border-slate-200 py-16 lg:py-24 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-12 items-center">
        {/* Left Column: Heading and CTAs */}
        <div className="lg:col-span-6 text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
            Turn emails into workflows automatically.
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl">
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
          <div className="w-full max-w-md border border-slate-200 rounded-xl bg-white p-5 shadow-xl flex flex-col gap-4 select-none">
            {/* Connection Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlugZap size={15} className="text-emerald-600 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">Gmail connection</span>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">Active</span>
            </div>

            {/* Active Workflow Card */}
            <div className="border border-slate-150 rounded-lg p-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Workflow Active</span>
                <span className="size-2 rounded-full bg-emerald-500"></span>
              </div>
              <h3 className="font-bold text-xs text-slate-800">Lead Follow-up Pipeline</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Automating responses for rajtiwari16916@gmail.com</p>
            </div>

            {/* Lead Card Item */}
            <div className="border border-slate-150 rounded-lg p-3 flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">SC</div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Sarah Chen</h4>
                  <p className="text-[10px] text-slate-500">sarah@example.com</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[9px] font-bold">New lead</span>
            </div>

            {/* Approval Preview Card */}
            <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-600">Pending Approval</span>
                </div>
                <span className="text-[9px] text-slate-400">2m ago</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-normal bg-slate-50 p-2 rounded border border-slate-100 font-mono line-clamp-2">
                Subject: Re: Inquiry - Hi Sarah, thanks for reaching out. I&apos;ve prepared...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

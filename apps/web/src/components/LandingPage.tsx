import { Bot, CheckCircle2, Mail, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 px-6 sm:px-12 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white">
            <Bot size={19} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide">FlowPilot AI</div>
            <div className="text-xs text-slate-400">Operations workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">
            Sign In
          </Link>
          <Link href="/signup" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition">
            Start Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 sm:px-12 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
          FlowPilot AI
        </h1>
        <p className="text-xl font-semibold text-slate-300 mt-4">
          AI-powered workflow automation for modern businesses.
        </p>
        <p className="text-md text-slate-400 mt-3 max-w-2xl mx-auto leading-7">
          Connect Gmail, automate lead follow-ups, manage approvals, and streamline operations with AI.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/signup" className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition">
            Start Free
          </Link>
          <Link href="/login" className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-base font-semibold text-slate-300 hover:bg-slate-700 transition">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-800">
        <h2 className="text-2xl font-bold text-center text-slate-100 mb-12">Streamline Your Operations</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <article className="border border-slate-800 bg-slate-950 p-6 rounded-xl shadow-sm hover:border-slate-700 transition">
            <Mail className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-slate-100 mt-4">Lead Automation</h3>
            <p className="text-sm text-slate-400 mt-2 leading-6">Automatically capture and qualify leads.</p>
          </article>
          <article className="border border-slate-800 bg-slate-950 p-6 rounded-xl shadow-sm hover:border-slate-700 transition">
            <Bot className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-slate-100 mt-4">AI Email Drafting</h3>
            <p className="text-sm text-slate-400 mt-2 leading-6">Generate personalized responses instantly.</p>
          </article>
          <article className="border border-slate-800 bg-slate-950 p-6 rounded-xl shadow-sm hover:border-slate-700 transition">
            <Workflow className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-slate-100 mt-4">Approval Workflows</h3>
            <p className="text-sm text-slate-400 mt-2 leading-6">Review before sending important communications.</p>
          </article>
          <article className="border border-slate-800 bg-slate-950 p-6 rounded-xl shadow-sm hover:border-slate-700 transition">
            <Bot className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-slate-100 mt-4">Gmail Integration</h3>
            <p className="text-sm text-slate-400 mt-2 leading-6">Connect Gmail securely with Google OAuth.</p>
          </article>
          <article className="border border-slate-800 bg-slate-950 p-6 rounded-xl shadow-sm hover:border-slate-700 transition">
            <CheckCircle2 className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold text-slate-100 mt-4">Activity Tracking</h3>
            <p className="text-sm text-slate-400 mt-2 leading-6">Track every action across your workspace.</p>
          </article>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-800">
        <h2 className="text-2xl font-bold text-center text-slate-100 mb-12">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="text-center p-4">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-900/50 text-blue-400 text-lg font-bold">1</div>
            <h3 className="font-semibold mt-4">Connect Gmail</h3>
            <p className="text-xs text-slate-400 mt-2">Link your inbox securely via OAuth</p>
          </div>
          <div className="text-center p-4">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-900/50 text-blue-400 text-lg font-bold">2</div>
            <h3 className="font-semibold mt-4">Import Leads</h3>
            <p className="text-xs text-slate-400 mt-2">Capture contacts and capture inquiry details</p>
          </div>
          <div className="text-center p-4">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-900/50 text-blue-400 text-lg font-bold">3</div>
            <h3 className="font-semibold mt-4">Generate AI Drafts</h3>
            <p className="text-xs text-slate-400 mt-2">Let our AI build custom contextual drafts</p>
          </div>
          <div className="text-center p-4">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-900/50 text-blue-400 text-lg font-bold">4</div>
            <h3 className="font-semibold mt-4">Approve &amp; Send</h3>
            <p className="text-xs text-slate-400 mt-2">Confirm drafts in your queue to execute dispatch</p>
          </div>
        </div>
      </section>

      {/* Trust & Security Sections */}
      <section className="py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-slate-800 grid gap-8 md:grid-cols-2">
        <article className="bg-slate-950 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Enterprise Trust</h2>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={16} /> Google OAuth integration
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={16} /> Encrypted Credentials at rest
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={16} /> Secure Infrastructure &amp; tokens
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="text-blue-500" size={16} /> Audit Logs active monitoring
            </li>
          </ul>
        </article>

        <article className="bg-slate-950 border border-slate-800 rounded-xl p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Zero-Trust Security</h2>
          <p className="text-sm text-slate-400 leading-6">
            FlowPilot only accesses permissions necessary for approved workflows. We utilize Google OAuth consent screens to guarantee user-controlled access.
          </p>
          <p className="text-sm text-slate-400 mt-3 leading-6 font-semibold">
            User data is never sold.
          </p>
        </article>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 sm:px-12 text-center max-w-4xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-extrabold tracking-tight">Start Automating Today</h2>
        <p className="text-sm text-slate-400 mt-3">Deploy custom Gmail and lead pipelines in minutes.</p>
        <Link href="/signup" className="inline-block mt-6 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition">
          Create Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white">
              <Bot size={16} />
            </div>
            <div className="text-sm font-bold">FlowPilot AI</div>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
          <div className="text-xs text-slate-500">
            Contact: <a href="mailto:rajtiwari16916@gmail.com" className="hover:underline text-slate-400">rajtiwari16916@gmail.com</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import { Brand } from "../AuthComponents";

export function HeroSection() {
  return (
    <header className="bg-slate-50 border-b border-slate-200">
      {/* Top Navbar */}
      <nav className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6 lg:px-8 bg-white border-b border-slate-100" aria-label="Main Navigation">
        <Brand />
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="primary-button"
            aria-label="Start Free Trial"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Body */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Automate operations with AI
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
          Connect Gmail, manage leads, create workflows, and automate repetitive work from a single workspace.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/signup"
            className="primary-button text-base px-6 py-3"
            aria-label="Create account to get started"
          >
            Start Free
          </Link>
          <Link
            href="/login"
            className="secondary-button text-base px-6 py-3"
            aria-label="Sign in to your account"
          >
            Sign In
          </Link>
        </div>
      </section>
    </header>
  );
}

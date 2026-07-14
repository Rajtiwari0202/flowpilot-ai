import Link from "next/link";
import { Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 px-6 sm:px-12 mt-16" aria-label="Site Footer">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5 select-none">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white">
            <Bot size={16} aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-slate-800">FlowPilot AI</span>
        </div>

        <div className="flex gap-6 text-sm">
          <Link
            href="/privacy"
            className="text-slate-500 hover:text-slate-900 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="View Privacy Policy"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-slate-500 hover:text-slate-900 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="View Terms of Service"
          >
            Terms of Service
          </Link>
        </div>

        <div className="text-xs text-slate-400">
          Contact:{" "}
          <a
            href="mailto:rajtiwari16916@gmail.com"
            className="text-slate-500 hover:text-slate-900 font-medium hover:underline transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Email support at rajtiwari16916@gmail.com"
          >
            rajtiwari16916@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}

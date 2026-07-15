import Link from "next/link";
import { Bot } from "lucide-react";
import { tokens } from "@/design-system";

export function Footer() {
  return (
    <footer className="border-t border-[#171717] bg-black py-12 px-6 sm:px-12" aria-label="Site Footer">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand label */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="grid size-8 place-items-center rounded-lg bg-orange-600 text-white">
            <Bot size={16} aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-white">ACE</span>
        </div>

        {/* Navigation / Policy links */}
        <div className="flex gap-6 text-sm font-medium">
          <Link
            href="/privacy"
            className="text-zinc-500 hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            aria-label="View Privacy Policy"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-zinc-500 hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            aria-label="View Terms of Service"
          >
            Terms of Service
          </Link>
        </div>

        {/* Support contact info */}
        <div className="text-xs text-zinc-500">
          Support:{" "}
          <a
            href="mailto:support@ace.ai"
            className="text-zinc-400 hover:text-white font-medium hover:underline transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600"
            aria-label="Email support at support@ace.ai"
          >
            support@ace.ai
          </a>
        </div>
      </div>
    </footer>
  );
}

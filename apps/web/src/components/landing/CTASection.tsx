import Link from "next/link";
import { tokens } from "@/design-system";

export function CTASection() {
  return (
    <section className="bg-black py-16 lg:py-24 px-6 lg:px-8 text-center border-b border-[#171717]" aria-label="Call to Action">
      <div className="mx-auto max-w-xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Stop losing leads. Start automating.</h2>
        <p className="mt-4 text-zinc-400 text-sm leading-relaxed">
          Configure secure Gmail synchronization pipelines and set up your automated workflows in under five minutes.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/signup"
            className="primary-button text-base px-6 py-3"
            aria-label="Create your account to start automating operations"
          >
            Connect Gmail
          </Link>
          <Link
            href="/login"
            className="secondary-button text-base px-6 py-3 border-[#171717] bg-[#0A0A0A] text-zinc-300 hover:bg-[#1f1f1f]"
            aria-label="Book Demo"
          >
            Book Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

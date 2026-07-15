import Link from "next/link";
import { tokens } from "../../design-system/tokens";

export function CTASection() {
  return (
    <section className={`${tokens.colors.bg} py-16 lg:py-24 px-6 lg:px-8 text-center`} aria-label="Call to Action">
      <div className="mx-auto max-w-xl">
        <h2 className={tokens.typography.h2}>Start automating today.</h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          Configure secure Gmail synchronization pipelines and set up your automated workflows in under five minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="primary-button text-base px-6 py-3"
            aria-label="Create your account to start automating operations"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </section>
  );
}

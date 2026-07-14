import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FlowPilot AI Terms of Service",
  description: "Terms and conditions of service for using FlowPilot AI.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-6 sm:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            &larr; Back to App
          </Link>
          <h1 className="text-3xl font-bold mt-4">FlowPilot AI Terms of Service</h1>
          <p className="text-sm text-slate-500 mt-2">Last Updated: July 2026</p>
        </div>

        <div className="space-y-6 text-sm leading-6 text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Acceptance of Terms</h2>
            <p>
              By creating an account or using FlowPilot AI, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">User Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the service only for lawful purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Google Integration Usage</h2>
            <p>
              The application integrates with third-party Google services via OAuth. You warrant that you have the right to authorize access to your Google account and Gmail inbox. You must comply with Google&apos;s API Services User Data Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Account Security</h2>
            <p>
              We protect account credentials and OAuth tokens using industry-standard encryption methods. However, you are solely responsible for notifying us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Limitation of Liability</h2>
            <p>
              FlowPilot AI shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the service, including data loss or automated actions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Service Availability</h2>
            <p>
              We strive to maintain continuous service availability. However, service may be temporarily interrupted for scheduled maintenance or infrastructure updates without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Contact Information</h2>
            <p>
              For any questions regarding these Terms, please contact us at:{" "}
              <a href="mailto:rajtiwari16916@gmail.com" className="text-blue-600 hover:underline">
                rajtiwari16916@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

import { Send, XCircle } from "lucide-react";
import { Approval } from "./types";
import { Badge, Empty } from "@/components/AuthComponents";

interface ApprovalsPageProps {
  approvals: Approval[];
  resolve: (form: HTMLFormElement, approval: Approval, action: "approve" | "reject") => Promise<void>;
  loading: boolean;
}

export function ApprovalsPage({ approvals, resolve, loading }: ApprovalsPageProps) {
  const pending = approvals.filter((item) => item.status === "pending");

  return (
    <div className="space-y-4">
      {pending.length ? (
        pending.map((approval) => (
          <form
            className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]"
            key={approval.id}
            onSubmit={(event) => {
              event.preventDefault();
              resolve(event.currentTarget, approval, "approve");
            }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">{approval.lead?.name || "New lead"}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-550">
                  {approval.lead?.email} - AI follow-up draft
                </p>
              </div>
              <Badge text="pending" />
            </div>
            <textarea
              className="input min-h-32 resize-y text-sm leading-6 dark:bg-slate-900/50"
              defaultValue={approval.draft}
              name="draft"
            />
            <div className="mt-4 flex gap-2">
              <button className="primary-button" disabled={loading} type="submit">
                <Send size={15} />
                Approve and send
              </button>
              <button
                className="secondary-button"
                disabled={loading}
                onClick={(event) => {
                  event.preventDefault();
                  resolve(event.currentTarget.form!, approval, "reject");
                }}
                type="button"
              >
                <XCircle size={15} />
                Reject
              </button>
            </div>
          </form>
        ))
      ) : (
        <Empty text="No pending approvals. Capture a lead to generate a draft." />
      )}
    </div>
  );
}

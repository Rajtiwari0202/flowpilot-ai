import { Workflow, CheckCircle2, Plus } from "lucide-react";
import { Template, WorkflowRow } from "./types";
import { Badge } from "@/components/AuthComponents";

interface TemplatesPageProps {
  templates: Template[];
  workflows: WorkflowRow[];
  mutate: (path: string, options: RequestInit, success: string) => Promise<void>;
}

export function TemplatesPage({ templates, workflows, mutate }: TemplatesPageProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const active = workflows.some((row) => row.templateId === template.id);
        return (
          <article className="panel p-5 bg-white dark:bg-[#0A0A0A] border-slate-200 dark:border-[#171717]" key={template.id}>
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-md bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-500">
                <Workflow size={18} />
              </div>
              {template.recommended && <Badge text="recommended" />}
            </div>
            <h2 className="mt-4 font-bold text-slate-900 dark:text-white">{template.title}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500 dark:text-zinc-550">{template.description}</p>
            <button
              className={active ? "secondary-button mt-4" : "primary-button mt-4"}
              disabled={active}
              onClick={() =>
                mutate(
                  "/api/workflows/from-template",
                  {
                    method: "POST",
                    body: JSON.stringify({ templateId: template.id }),
                  },
                  `${template.title} activated.`
                )
              }
              type="button"
            >
              {active ? <CheckCircle2 size={15} /> : <Plus size={15} />}
              {active ? "Active" : "Activate"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

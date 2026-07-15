# FlowPilot AI — Homepage Performance Audit

This document audits the performance, optimization properties, and assets of the redesigned public homepage.

---

## 1. Performance & Optimizations

* **Server Component Architecture**: The subcomponents under `components/landing/` do not require interactive client state and are built as Server Components. Only `Navbar` uses `"use client"` to handle scroll listener states, minimizing JS bundle hydration.
* **Prerendering**: Next.js App Router successfully compiled the pages as statically prerendered assets:
  ```
  Route (app)                                 Size  First Load JS
  ├ ○ /                                    13.5 kB         122 kB
  ```
* **No Large Images / Dependencies**: The `ProductPreview.tsx` dashboard mockup and `Hero.tsx` preview are implemented entirely with CSS grids, borders, and vector icons (`lucide-react`), removing heavy image asset downloads and latency.
* **No Heavy Animation Libraries**: Replaced gradient animations and transitions with native Tailwind CSS hover states and transitions, avoiding large libraries like Framer Motion or GSAP.

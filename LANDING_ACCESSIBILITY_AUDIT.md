# FlowPilot AI — Homepage Accessibility Audit

This document audits the accessibility standards, WCAG compliance, and semantic properties of the redesigned public homepage.

---

## 1. Accessibility Checks

* **Aria Role Labels**: Navigations, headers, and footer layouts use explicit aria tags (`aria-label="Main Navigation"`, `aria-label="Product Features"`, etc.).
* **Keyboard Navigation**: Anchor routes and CTAs have visible focus state outlines (`focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600`) to guarantee keyboard navigability.
* **Semantic HTML**: Redesigned blocks follow strict semantic guidelines, utilizing tags like `header`, `nav`, `section`, `article`, and `footer` correctly.
* **Color Contrast**: Main body text runs on `#0f172a` (slate-900) or `#475569` (slate-500) on a light `#f8fafc` background, exceeding the WCAG AA minimum contrast ratio (4.5:1).

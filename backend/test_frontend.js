const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("🖥️ Starting Frontend Contract and Page Rendering Validation Test Suite...");

const pagePath = path.join(__dirname, "../apps/web/src/app/page.tsx");
assert.ok(fs.existsSync(pagePath), "Next.js page.tsx frontend main component file is missing!");

const content = fs.readFileSync(pagePath, "utf8");

assert.ok(content.includes("<AuthScreen"), "Missing AuthScreen UI view!");
assert.ok(content.includes("<BusinessSetup"), "Missing BusinessSetup onboarding UI view!");
assert.ok(content.includes('page === "dashboard"'), "Missing Dashboard UI page conditional!");
assert.ok(content.includes('page === "automations"'), "Missing Automations UI page conditional!");
assert.ok(content.includes('page === "leads"'), "Missing Leads UI page conditional!");
assert.ok(content.includes('page === "approvals"'), "Missing Approvals UI page conditional!");
assert.ok(content.includes('page === "templates"'), "Missing Templates UI page conditional!");
assert.ok(content.includes('page === "integrations"'), "Missing Integrations UI page conditional!");
assert.ok(content.includes('page === "activity"'), "Missing Activity UI page conditional!");
assert.ok(content.includes('page === "settings"'), "Missing Settings UI page conditional!");

console.log("✅ Next.js Frontend Component Audit Passed Successfully!");

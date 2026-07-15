import { FormEvent } from "react";
import { Bot, Sparkles } from "lucide-react";

export type AuthMode = "signup" | "login" | "forgot";
export type User = { id: string; name: string; email: string; plan: string };

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 place-items-center rounded-lg bg-orange-600 text-white">
        <Bot size={19} />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900 dark:text-white">ACE</div>
        <div className="text-xs text-slate-500 dark:text-zinc-400 font-semibold tracking-tight">Autonomous Chief Executor</div>
      </div>
    </div>
  );
}

export function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300">{label}<input className="input mt-2" name={name} {...props} /></label>;
}

export function Select({ label, name, options, ...props }: { label: string; name: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300">{label}<select className="input mt-2" name={name} {...props}>{options.map((item) => <option key={item} value={item} className="dark:bg-slate-900">{item.replaceAll("_", " ")}</option>)}</select></label>;
}

export function Badge({ text }: { text: string }) {
  const tone = text === "pending" || text.includes("required") || text === "local" || text === "local json" || text === "checking" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" : text === "error" ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{text.replaceAll("_", " ")}</span>;
}

export function Banner({ text, tone }: { text: string; tone: "success" | "error" }) {
  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${tone === "success" ? "border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400" : "border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400"}`}>{text}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="panel p-8 text-center text-sm text-slate-500 dark:text-zinc-500">{text}</div>;
}

export function AuthScreen({ mode, setMode, submit, forgotPasswordSubmit, resetPasswordSubmit, resetPasswordToken, launchSandbox, googleLogin, loading, notice, error, hideModeToggle = false }: { mode: AuthMode; setMode: (mode: AuthMode) => void; submit: (event: FormEvent<HTMLFormElement>) => void; forgotPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void; resetPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void; resetPasswordToken: string; launchSandbox: () => void; googleLogin: () => void; loading: boolean; notice: string; error: string; hideModeToggle?: boolean }) {
  if (resetPasswordToken) return <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-black p-6"><div className="w-full max-w-md"><div className="mb-6"><Brand /></div><div className="panel p-6"><h1 className="text-xl font-bold text-slate-900 dark:text-white">Choose a new password</h1><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Use at least eight characters.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 space-y-4" onSubmit={resetPasswordSubmit}><Field label="New password" name="password" placeholder="Minimum 8 characters" required type="password" /><button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Updating..." : "Update password"}</button></form></div></div></main>;
  if (mode === "forgot") return <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-black p-6"><div className="w-full max-w-md"><div className="mb-6"><Brand /></div><div className="panel p-6"><h1 className="text-xl font-bold text-slate-900 dark:text-white">Reset your password</h1><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">We will send a recovery link if the account exists.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 space-y-4" onSubmit={forgotPasswordSubmit}><Field label="Work email" name="email" placeholder="alex@company.com" required type="email" /><button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Sending..." : "Send recovery link"}</button></form><button className="mt-4 w-full text-sm font-semibold text-orange-650 dark:text-orange-500" onClick={() => setMode("login")} type="button">Back to login</button></div></div></main>;
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-black p-6">
      <div className="w-full max-w-md">
        <div className="mb-6"><Brand /></div>
        <div className="panel p-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{mode === "signup" ? "Create your ACE account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Connect your Gmail and start automating leads in minutes.</p>
          {notice && <Banner text={notice} tone="success" />}
          {error && <Banner text={error} tone="error" />}
          <button
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-zinc-800"
            disabled={loading}
            onClick={googleLogin}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {mode === "signup" ? "Continue with Google" : "Sign in with Google"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-zinc-500">Gmail access is requested so ACE can read leads and send follow-ups on your behalf.</p>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-400 dark:text-zinc-500"><span className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" />or use email &amp; password<span className="h-px flex-1 bg-slate-200 dark:bg-zinc-800" /></div>
          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && <Field label="Full name" name="name" placeholder="Alex Johnson" required />}
            <Field label="Work email" name="email" placeholder="alex@company.com" required type="email" />
            <Field label="Password" name="password" placeholder="Minimum 8 characters" required type="password" />
            <button className="primary-button w-full" disabled={loading} type="submit">{loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}</button>
          </form>
          {mode === "login" && <button className="mt-4 w-full text-sm font-semibold text-orange-650 dark:text-orange-500" onClick={() => setMode("forgot")} type="button">Forgot password?</button>}
          {!hideModeToggle && (
            <button className="mt-4 w-full text-sm font-semibold text-orange-650 dark:text-orange-500" onClick={() => { window.sessionStorage.setItem("flowpilot_skip_sandbox", "1"); setMode(mode === "signup" ? "login" : "signup"); }} type="button">{mode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}</button>
          )}
          <div className="mt-5 border-t border-slate-100 dark:border-zinc-800 pt-4"><button className="secondary-button w-full border-orange-200 dark:border-orange-950/30 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400" disabled={loading} onClick={launchSandbox} type="button"><Sparkles size={16} />Try ACE sandbox</button></div>
        </div>
      </div>
    </main>
  );
}

export function BusinessSetup({ submit, loading, error, user }: { submit: (event: FormEvent<HTMLFormElement>) => void; loading: boolean; error: string; user: User | null }) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-black p-6"><div className="w-full max-w-xl"><div className="mb-6"><Brand /></div><div className="panel p-6"><p className="text-xs font-bold uppercase text-orange-600 dark:text-orange-500">Onboarding</p><h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Set up your business</h1><p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Hi {user?.name?.split(" ")[0] || "there"}, these details personalize your follow-up drafts.</p>{error && <Banner text={error} tone="error" />}<form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}><div className="sm:col-span-2"><Field label="Business name" name="name" placeholder="e.g. Raj Digital Agency" required /></div><Select label="Business type" name="type" options={["agency", "e-commerce", "service_business", "startup", "solo_founder", "other"]} /><Select label="Reply tone" name="tone" options={["professional", "friendly"]} /><button className="primary-button sm:col-span-2" disabled={loading} type="submit">{loading ? "Saving..." : "Save and open workspace"}</button></form></div></div></main>;
}

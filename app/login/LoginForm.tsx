"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/components/ui";

import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next, demo }: { next?: string; demo: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email ?? (demo ? "admin@tenurage.demo" : "")} className={`mt-1 ${inputClass}`} />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={demo ? "tenurage123" : ""} className={`mt-1 ${inputClass}`} />
      </div>
      {state.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

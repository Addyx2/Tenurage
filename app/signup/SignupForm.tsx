"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/components/ui";

import { signupAction, type SignupState } from "./actions";

const FIELDS = [
  { name: "agencyName", label: "Agency name", type: "text", auto: "organization" },
  { name: "firstName", label: "First name", type: "text", auto: "given-name" },
  { name: "lastName", label: "Last name", type: "text", auto: "family-name" },
  { name: "email", label: "Work email", type: "email", auto: "username" },
];

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  return (
    <form action={action} className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className={labelClass}>{f.label}</label>
          <input id={f.name} name={f.name} type={f.type} autoComplete={f.auto} required defaultValue={state.values?.[f.name] ?? ""} className={`mt-1 ${inputClass}`} />
        </div>
      ))}
      <div>
        <label htmlFor="password" className={labelClass}>Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className={`mt-1 ${inputClass}`} />
        <p className="mt-1 text-xs text-slate-500">At least 10 characters.</p>
      </div>
      {state.error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>{pending ? "Creating…" : "Create agency"}</button>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { addMemberAction, type AddMemberState } from "./actions";

const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500";

export function AddMemberForm() {
  const [state, action, pending] = useActionState<AddMemberState, FormData>(addMemberAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-5">
      <input name="firstName" placeholder="First name" required aria-label="First name" className={field} />
      <input name="lastName" placeholder="Last name" required aria-label="Last name" className={field} />
      <input name="email" type="email" placeholder="Email" required aria-label="Email" className={field} />
      <select name="role" defaultValue="NEGOTIATOR" aria-label="Role" className={field}><option value="NEGOTIATOR">Negotiator</option><option value="ADMIN">Admin</option></select>
      <button disabled={pending} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{pending ? "Adding…" : "Add"}</button>
      {state.error ? <p role="alert" className="text-sm text-red-700 sm:col-span-5">{state.error}</p> : null}
      {state.added ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-5">
          Added {state.added.email}. Their password is <span className="select-all font-mono font-semibold">{state.added.password}</span>. It won&apos;t be shown again: pass it on privately.
        </p>
      ) : null}
    </form>
  );
}

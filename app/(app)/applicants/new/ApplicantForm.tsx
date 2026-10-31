"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/components/ui";

import { createApplicantAction, type FormState } from "../actions";

export function ApplicantForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createApplicantAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div><label className={labelClass} htmlFor="firstName">First name</label><input id="firstName" name="firstName" required className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="lastName">Last name</label><input id="lastName" name="lastName" required className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="phone">Mobile</label><input id="phone" name="phone" placeholder="07700 900123" className={`mt-1 ${inputClass}`} /><p className="mt-1 text-xs text-slate-500">Linkbot texts them viewings on this number.</p></div>
      <div><label className={labelClass} htmlFor="email">Email</label><input id="email" name="email" type="email" className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="market">Looking to</label><select id="market" name="market" className={`mt-1 ${inputClass}`}><option value="LET">Rent</option><option value="SALE">Buy</option></select></div>
      <div><label className={labelClass} htmlFor="minBedrooms">At least … bedrooms</label><input id="minBedrooms" name="minBedrooms" type="number" min={0} max={20} defaultValue={1} className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="maxPrice">Budget (£, or rent per month)</label><input id="maxPrice" name="maxPrice" type="number" min={1} required className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="areas">Areas</label><input id="areas" name="areas" placeholder="BS6, BS7, Clifton" className={`mt-1 ${inputClass}`} /><p className="mt-1 text-xs text-slate-500">Postcode districts or towns. Leave empty for anywhere.</p></div>
      <div className="sm:col-span-2"><label className={labelClass} htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={2} maxLength={1000} className={`mt-1 ${inputClass}`} /></div>
      {state.error ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2"><button type="submit" disabled={pending} className={buttonClass}>{pending ? "Adding…" : "Add applicant"}</button></div>
    </form>
  );
}

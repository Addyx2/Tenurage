"use client";

import { useActionState } from "react";

import { buttonClass, inputClass, labelClass } from "@/components/ui";

import { createPropertyAction, type FormState } from "../actions";

export function PropertyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createPropertyAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div><label className={labelClass} htmlFor="market">For</label><select id="market" name="market" className={`mt-1 ${inputClass}`}><option value="LET">To let</option><option value="SALE">For sale</option></select></div>
      <div><label className={labelClass} htmlFor="kind">Type</label><select id="kind" name="kind" className={`mt-1 ${inputClass}`}><option value="flat">Flat</option><option value="house">House</option><option value="bungalow">Bungalow</option><option value="other">Other</option></select></div>
      <div className="sm:col-span-2"><label className={labelClass} htmlFor="address">Address</label><input id="address" name="address" required maxLength={200} placeholder="Flat 2, 14 Cotham Hill, Bristol" className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="postcode">Postcode</label><input id="postcode" name="postcode" required placeholder="BS6 5QX" className={`mt-1 ${inputClass}`} /></div>
      <div><label className={labelClass} htmlFor="bedrooms">Bedrooms</label><input id="bedrooms" name="bedrooms" type="number" min={0} max={20} defaultValue={2} className={`mt-1 ${inputClass}`} /></div>
      <div className="sm:col-span-2"><label className={labelClass} htmlFor="price">Price, or rent per month (£)</label><input id="price" name="price" type="number" min={1} required className={`mt-1 ${inputClass}`} /></div>
      <div className="sm:col-span-2"><label className={labelClass} htmlFor="summary">Summary</label><textarea id="summary" name="summary" rows={3} maxLength={2000} className={`mt-1 ${inputClass}`} /></div>
      <div className="sm:col-span-2"><label className={labelClass} htmlFor="features">Features (one per line)</label><textarea id="features" name="features" rows={3} maxLength={1000} placeholder={"Garden\nOff-street parking"} className={`mt-1 ${inputClass}`} /></div>
      {state.error ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p> : null}
      <div className="sm:col-span-2"><button type="submit" disabled={pending} className={buttonClass}>{pending ? "Adding…" : "Add property"}</button></div>
    </form>
  );
}

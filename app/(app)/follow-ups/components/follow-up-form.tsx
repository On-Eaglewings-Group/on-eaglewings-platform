"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createFollowUpAction,
  updateFollowUpAction,
  type FollowUpActionResult,
} from "@/app/actions/follow-ups";
import { ArrowLeftIcon, ClockIcon } from "@/app/components/icons";

interface Option {
  id: string;
  label: string;
}

interface Member {
  user_id: string;
  label: string;
}

const inputClass =
  "w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900";

export function FollowUpForm({
  mode,
  followUpId,
  members,
  contacts,
  meetings,
  opportunities,
  requirements,
  defaultValues = {},
}: {
  mode: "create" | "edit";
  followUpId?: string;
  members: Member[];
  contacts: Option[];
  meetings: Option[];
  opportunities: Option[];
  requirements: Option[];
  defaultValues?: {
    title?: string;
    description?: string | null;
    due_on?: string | null;
    priority?: string;
    status?: string;
    assigned_to?: string | null;
    contact_id?: string | null;
    meeting_id?: string | null;
    mineral_opportunity_id?: string | null;
    buyer_requirement_id?: string | null;
  };
}) {
  const action = mode === "create" ? createFollowUpAction : updateFollowUpAction.bind(null, followUpId!);
  const [state, formAction, pending] = useActionState<FollowUpActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>
      )}
      {state?.ok && mode === "edit" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Follow-up updated.
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal">Title <span className="text-red-500">*</span></label>
          <input name="title" required defaultValue={defaultValues.title ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Status</label>
            <select name="status" defaultValue={defaultValues.status ?? "open"} className={inputClass}>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Priority</label>
            <select name="priority" defaultValue={defaultValues.priority ?? "normal"} className={inputClass}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-charcoal">Due date</label>
            <input type="date" name="due_on" defaultValue={defaultValues.due_on ?? ""} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal">Assigned to</label>
          <select name="assigned_to" defaultValue={defaultValues.assigned_to ?? ""} className={inputClass}>
            <option value="">— Unassigned —</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>{member.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-charcoal">Description</label>
          <textarea name="description" rows={3} defaultValue={defaultValues.description ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-charcoal">Linked records</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField name="contact_id" label="Contact" value={defaultValues.contact_id} options={contacts} />
          <SelectField name="meeting_id" label="Meeting" value={defaultValues.meeting_id} options={meetings} />
          <SelectField name="mineral_opportunity_id" label="Opportunity" value={defaultValues.mineral_opportunity_id} options={opportunities} />
          <SelectField name="buyer_requirement_id" label="Buyer requirement" value={defaultValues.buyer_requirement_id} options={requirements} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60">
          <ClockIcon className="h-4 w-4" />
          {pending ? "Saving…" : mode === "create" ? "Save follow-up" : "Update follow-up"}
        </button>
        <Link href={mode === "edit" && followUpId ? `/follow-ups/${followUpId}` : "/follow-ups"} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Cancel
        </Link>
      </div>
    </form>
  );
}

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string | null;
  options: Option[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-charcoal">{label}</label>
      <select name={name} defaultValue={value ?? ""} className={inputClass}>
        <option value="">— None —</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

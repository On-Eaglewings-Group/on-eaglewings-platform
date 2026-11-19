"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMeetingAction,
  updateMeetingAction,
  type MeetingActionResult,
} from "@/app/actions/meetings";
import {
  ArrowLeftIcon,
  CalendarIcon,
  PlusIcon,
  TrashIcon,
} from "@/app/components/icons";
import Link from "next/link";

interface Contact {
  id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
}

interface Opportunity {
  id: string;
  title: string;
  status: string;
}

interface BuyerRequirement {
  id: string;
  title: string;
  status: string;
}

interface MeetingFormProps {
  mode: "create" | "edit";
  meetingId?: string;
  contacts: Contact[];
  opportunities: Opportunity[];
  requirements: BuyerRequirement[];
  defaultValues?: {
    title?: string;
    starts_at_date?: string;
    starts_at_time?: string;
    ends_at_date?: string | null;
    ends_at_time?: string | null;
    timezone?: string;
    location?: string | null;
    agenda?: string | null;
    outcome?: string | null;
    status?: string;
    mineral_opportunity_id?: string | null;
    buyer_requirement_id?: string | null;
  };
  defaultAttendeeIds?: string[];
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const TIMEZONES = [
  "UTC",
  "Africa/Johannesburg",
  "Africa/Lusaka",
  "Africa/Kinshasa",
  "Africa/Harare",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
];

export function MeetingForm({
  mode,
  meetingId,
  contacts,
  opportunities,
  requirements,
  defaultValues = {},
  defaultAttendeeIds = [],
}: MeetingFormProps) {
  const router = useRouter();
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(
    defaultAttendeeIds,
  );
  const [contactSearch, setContactSearch] = useState("");

  const action =
    mode === "create"
      ? createMeetingAction
      : updateMeetingAction.bind(null, meetingId!);

  const [state, formAction, isPending] = useActionState<
    MeetingActionResult | null,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  const filteredContacts = contactSearch
    ? contacts.filter((c) =>
        `${c.full_name} ${c.email ?? ""} ${c.job_title ?? ""}`
          .toLowerCase()
          .includes(contactSearch.toLowerCase()),
      )
    : contacts;

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      {state?.ok && mode === "edit" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Meeting updated successfully.
        </div>
      )}

      {/* Hidden attendee fields */}
      {selectedAttendees.map((id) => (
        <input key={id} type="hidden" name="attendee_ids" value={id} />
      ))}

      {/* Core details */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Meeting Details</h2>

        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            defaultValue={defaultValues.title ?? ""}
            required
            placeholder="e.g. Introductory call — Lumwana Copper / On-Eaglewings"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={defaultValues.status ?? "scheduled"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue={defaultValues.timezone ?? "UTC"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date / time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-charcoal">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="starts_at_date"
              defaultValue={defaultValues.starts_at_date ?? ""}
              required
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
            <label className="block text-xs font-medium text-charcoal">
              Start Time
            </label>
            <input
              type="time"
              name="starts_at_time"
              defaultValue={defaultValues.starts_at_time ?? "09:00"}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-charcoal">
              End Date
            </label>
            <input
              type="date"
              name="ends_at_date"
              defaultValue={defaultValues.ends_at_date ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
            <label className="block text-xs font-medium text-charcoal">
              End Time
            </label>
            <input
              type="time"
              name="ends_at_time"
              defaultValue={defaultValues.ends_at_time ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Location / Video Conference URL
          </label>
          <input
            type="text"
            name="location"
            defaultValue={defaultValues.location ?? ""}
            placeholder="e.g. Sandton office, or https://meet.google.com/xxx"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
          />
        </div>
      </div>

      {/* Links */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Link to Opportunity or Requirement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Mineral Opportunity
            </label>
            <select
              name="mineral_opportunity_id"
              defaultValue={defaultValues.mineral_opportunity_id ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— None —</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-charcoal mb-1">
              Buyer Requirement
            </label>
            <select
              name="buyer_requirement_id"
              defaultValue={defaultValues.buyer_requirement_id ?? ""}
              className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <option value="">— None —</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agenda + Outcome */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">Agenda & Outcomes</h2>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Agenda
          </label>
          <textarea
            name="agenda"
            defaultValue={defaultValues.agenda ?? ""}
            rows={3}
            placeholder="Topics to be discussed…"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-charcoal mb-1">
            Minutes, Outcomes & Next Actions
          </label>
          <textarea
            name="outcome"
            defaultValue={defaultValues.outcome ?? ""}
            rows={4}
            placeholder="Summary of discussion, decisions made, action items and owners…"
            className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900 resize-none"
          />
        </div>
      </div>

      {/* Attendees */}
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-charcoal">
          Attendees ({selectedAttendees.length} selected)
        </h2>
        <input
          type="text"
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-full rounded-lg border border-border bg-workspace/50 px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
        />
        {contacts.length === 0 ? (
          <p className="text-xs text-muted">
            No contacts in the directory yet. Add contacts first to invite
            attendees.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
            {filteredContacts.map((c) => {
              const isSelected = selectedAttendees.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    isSelected
                      ? "bg-navy-50 text-navy-900"
                      : "hover:bg-workspace"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAttendee(c.id)}
                    className="h-4 w-4 rounded border-border text-navy-900 focus:ring-navy-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">
                      {c.full_name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {c.job_title ?? c.email ?? ""}
                    </p>
                  </div>
                </label>
              );
            })}
            {filteredContacts.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">
                No contacts match your search.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800 disabled:opacity-60"
        >
          <CalendarIcon className="h-4 w-4" />
          {isPending
            ? mode === "create"
              ? "Saving…"
              : "Updating…"
            : mode === "create"
              ? "Schedule Meeting"
              : "Update Meeting"}
        </button>
        <Link
          href={
            mode === "edit" && meetingId
              ? `/meetings/${meetingId}`
              : "/meetings"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-workspace"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Cancel
        </Link>
      </div>
    </form>
  );
}

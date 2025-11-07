"use client";

import { useEffect, useMemo, useState } from "react";
import DateTimePicker from "@/components/DateTimePicker";

type Scope = "INDIVIDUAL" | "GROUP" | "FAMILY";

type GroupNode = {
  id: string;
  nickname: string;
  parentId: string | null;
  members: { id: string; name: string | null; image: string | null }[];
};

type Member = { id: string; name: string | null; image: string | null };

type UnavailabilityEntry = {
  id: string;
  title: string | null;
  reason: string | null;
  scope: Scope;
  startAt: string;
  endAt: string | null;
  status: string;
  createdAt: string;
  participants: {
    id: string;
    role: string;
    note: string | null;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  }[];
  createdBy: { id: string; name: string | null; email: string | null };
  group: { id: string; nickname: string | null } | null;
};

type CreationImpact = {
  cancelledEvents: { id: string; title: string; startAt: string; ownerId: string }[];
  updatedRsvps: { id: string; eventId: string; userId: string }[];
};

const dateTime = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

const toLocalInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const collectGroupMemberIds = (
  groupId: string,
  byId: Map<string, GroupNode>,
  byParent: Map<string | null, GroupNode[]>
) => {
  const res = new Set<string>();
  const stack = [groupId];
  while (stack.length) {
    const gid = stack.pop()!;
    const node = byId.get(gid);
    if (!node) continue;
    node.members.forEach((m) => res.add(m.id));
    const children = byParent.get(gid) || [];
    children.forEach((child) => stack.push(child.id));
  }
  return Array.from(res);
};

function formatRange(startISO: string, endISO: string | null) {
  if (!startISO) return "";
  const start = new Date(startISO);
  if (!endISO) {
    return `${dateTime.format(start)} – ללא תאריך סיום`;
  }
  const end = new Date(endISO);
  if (start.toDateString() === end.toDateString()) {
    return `${dateTime.format(start)} – ${new Intl.DateTimeFormat("he-IL", { timeStyle: "short" }).format(end)}`;
  }
  return `${dateTime.format(start)} – ${dateTime.format(end)}`;
}

export default function UnavailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [entries, setEntries] = useState<UnavailabilityEntry[]>([]);
  const [me, setMe] = useState<{ id: string; name: string | null } | null>(null);

  const [scope, setScope] = useState<Scope>("INDIVIDUAL");
  const [groupId, setGroupId] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [primaryUsers, setPrimaryUsers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [rsvpNote, setRsvpNote] = useState("");
  const [startAt, setStartAt] = useState(() => toLocalInputValue(new Date()));
  const [hasEnd, setHasEnd] = useState(false);
  const [endAt, setEndAt] = useState("");
  const [autoCancelHostedEvents, setAutoCancelHostedEvents] = useState(false);
  const [autoUpdateRsvps, setAutoUpdateRsvps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastImpact, setLastImpact] = useState<CreationImpact | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meRes, groupsRes, entriesRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/family/groups", { cache: "no-store" }),
          fetch("/api/unavailability?includeArchived=false", { cache: "no-store" }),
        ]);
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson?.user?.id) {
            setMe({ id: meJson.user.id, name: meJson.user.name ?? null });
          }
        }
        if (groupsRes.ok) {
          const groupsJson = await groupsRes.json();
          setGroups(groupsJson?.groups || []);
          if (!groupId && groupsJson?.groups?.length) {
            setGroupId(groupsJson.groups[0].id);
          }
        }
        if (entriesRes.ok) {
          const entriesJson = await entriesRes.json();
          setEntries(
            (entriesJson?.unavailabilities || []).sort(
              (a: UnavailabilityEntry, b: UnavailabilityEntry) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
            )
          );
        }
      } catch (err) {
        console.error("[ui] failed to load unavailability data", err);
        setError("טעינת הנתונים נכשלה, נסו שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupById = useMemo(() => {
    const map = new Map<string, GroupNode>();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  const groupChildren = useMemo(() => {
    const map = new Map<string | null, GroupNode[]>();
    groups.forEach((g) => {
      const key = g.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return map;
  }, [groups]);

  const allMembers: Member[] = useMemo(() => {
    const map = new Map<string, Member>();
    groups.forEach((g) => {
      g.members.forEach((m) => {
        if (!map.has(m.id)) {
          map.set(m.id, { id: m.id, name: m.name ?? null, image: m.image ?? null });
        }
      });
    });
    if (me && !map.has(me.id)) {
      map.set(me.id, { id: me.id, name: me.name ?? null, image: null });
    }
    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || "", "he"));
  }, [groups, me]);

  useEffect(() => {
    if (selectedUsers.length === 0 && me?.id) {
      setSelectedUsers([me.id]);
      setPrimaryUsers([me.id]);
    }
  }, [me, selectedUsers.length]);

  useEffect(() => {
    setPrimaryUsers((prev) => {
      const filtered = prev.filter((id) => selectedUsers.includes(id));
      if (filtered.length === prev.length) {
        if (filtered.length === 0 && selectedUsers.length > 0) {
          const preferred = me && selectedUsers.includes(me.id) ? me.id : selectedUsers[0];
          return preferred ? [preferred] : [];
        }
        return prev;
      }
      if (filtered.length > 0) return filtered;
      if (selectedUsers.length === 0) return [];
      const preferred = me && selectedUsers.includes(me.id) ? me.id : selectedUsers[0];
      return preferred ? [preferred] : [];
    });
  }, [selectedUsers, me]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const togglePrimary = (userId: string) => {
    setPrimaryUsers((prev) => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const toggleAll = (value: boolean) => {
    if (value) {
      setSelectedUsers(allMembers.map((m) => m.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const applyScopeDefault = (nextScope: Scope, nextGroupId?: string) => {
    if (nextScope === "FAMILY") {
      setSelectedUsers(allMembers.map((m) => m.id));
      if (me?.id && allMembers.some((m) => m.id === me.id)) {
        setPrimaryUsers([me.id]);
      } else if (allMembers.length) {
        setPrimaryUsers([allMembers[0].id]);
      }
    } else if (nextScope === "GROUP") {
      const gid = nextGroupId || groupId || (groups[0]?.id ?? "");
      if (gid) {
        const members = collectGroupMemberIds(gid, groupById, groupChildren);
        setSelectedUsers(members);
        if (members.length) {
          if (me?.id && members.includes(me.id)) setPrimaryUsers([me.id]);
          else setPrimaryUsers([members[0]]);
        } else {
          setPrimaryUsers([]);
        }
      }
    } else if (nextScope === "INDIVIDUAL") {
      if (me?.id) {
        setSelectedUsers([me.id]);
        setPrimaryUsers([me.id]);
      } else if (selectedUsers.length === 0 && allMembers.length > 0) {
        setSelectedUsers([allMembers[0].id]);
        setPrimaryUsers([allMembers[0].id]);
      }
    }
  };

  const onScopeChange = (value: Scope) => {
    setScope(value);
    applyScopeDefault(value);
  };

  const onGroupChange = (value: string) => {
    setGroupId(value);
    if (scope === "GROUP") {
      applyScopeDefault("GROUP", value);
    }
  };

  const disabledSubmit = saving || !startAt || selectedUsers.length === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabledSubmit) return;
    setSaving(true);
    setSaveError(null);
    setLastImpact(null);
    try {
      const payload: any = {
        scope,
        title: title.trim() || null,
        reason: reason.trim() || null,
        rsvpNote: rsvpNote.trim() || null,
        startAt,
        endAt: hasEnd && endAt ? endAt : null,
        autoCancelHostedEvents,
        autoUpdateRsvps,
        participantIds: selectedUsers,
        primaryParticipantIds: primaryUsers,
      };
      if (scope === "GROUP" && groupId) {
        payload.groupId = groupId;
      }
      const res = await fetch("/api/unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "שמירת החסימה נכשלה");
      }
      const impact: CreationImpact = {
        cancelledEvents: data?.cancelledEvents ?? [],
        updatedRsvps: data?.updatedRsvps ?? [],
      };
      setLastImpact(impact);
      if (data?.unavailability) {
        setEntries((prev) =>
          [data.unavailability as UnavailabilityEntry, ...prev].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          )
        );
      }
      setTitle("");
      setReason("");
      setRsvpNote("");
      setAutoCancelHostedEvents(false);
      setAutoUpdateRsvps(true);
    } catch (err: any) {
      console.error("[ui] failed to create unavailability", err);
      setSaveError(err instanceof Error ? err.message : "שמירת החסימה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container-page space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">חסימת זמינות</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          צרו חסימה עבור אדם יחיד, קבוצה או כל המשפחה, כדי למנוע הזמנות לתאריכים אלו ולאפשר ביטול אירועים קיימים באופן אוטומטי.
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-gray-600 dark:text-gray-300">טוען נתונים…</div>
      ) : error ? (
        <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded">{error}</div>
      ) : (
        <>
          <section className="max-w-3xl">
            <form onSubmit={submit} className="space-y-4 border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">כותרת (אופציונלי)</div>
                  <input
                    className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">סיבה / הערה</div>
                  <input
                    className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="טיול משפחתי, מילואים, חופשה…"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DateTimePicker label="תאריך התחלה" value={startAt} onChange={setStartAt} timeToggle allowDateOnly />
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hasEnd}
                      onChange={(e) => {
                        setHasEnd(e.target.checked);
                        if (!e.target.checked) setEndAt("");
                      }}
                    />
                    <span>להגדיר תאריך סיום</span>
                  </label>
                  {hasEnd && (
                    <DateTimePicker
                      label="תאריך סיום"
                      value={endAt}
                      onChange={setEndAt}
                      allowDateOnly
                      timeToggle
                      min={startAt || undefined}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">טווח החסימה</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      value="INDIVIDUAL"
                      checked={scope === "INDIVIDUAL"}
                      onChange={() => onScopeChange("INDIVIDUAL")}
                    />
                    <span>אדם אחד</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      value="GROUP"
                      checked={scope === "GROUP"}
                      onChange={() => onScopeChange("GROUP")}
                    />
                    <span>קבוצה</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      value="FAMILY"
                      checked={scope === "FAMILY"}
                      onChange={() => onScopeChange("FAMILY")}
                    />
                    <span>כל המשפחה</span>
                  </label>
                </div>
                {scope === "GROUP" && (
                  <select
                    className="w-full md:w-64 border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    value={groupId}
                    onChange={(e) => onGroupChange(e.target.value)}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nickname}
                      </option>
                    ))}
                  </select>
                )}
                {scope === "FAMILY" && (
                  <div className="text-xs text-gray-500">
                    כל בני המשפחה נבחרו אוטומטית. ניתן להסיר חברים מהחסימה לפי הצורך.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">משתתפים</h2>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === allMembers.length && allMembers.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                    <span>בחירה/ביטול של כולם</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((member) => {
                    const checked = selectedUsers.includes(member.id);
                    return (
                      <label
                        key={member.id}
                        className={`px-3 py-2 rounded border text-sm transition ${
                          checked
                            ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-700 dark:border-blue-700"
                            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={checked}
                          onChange={() => toggleUser(member.id)}
                        />
                        {member.name || member.id.slice(0, 6)}
                      </label>
                    );
                  })}
                  {allMembers.length === 0 && (
                    <div className="text-sm text-gray-500">לא נמצאו חברים להצגה.</div>
                  )}
                </div>
                {selectedUsers.length === 0 && (
                  <div className="text-xs text-red-600">יש לבחור לפחות אדם אחד לחסימה.</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">שותפים ראשיים (יוצג כתיאור החסימה)</div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const member = allMembers.find((m) => m.id === userId);
                    const name = member?.name || userId.slice(0, 6);
                    const checked = primaryUsers.includes(userId);
                    return (
                      <label
                        key={userId}
                        className={`px-3 py-1 rounded border text-xs ${
                          checked
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mr-1"
                          checked={checked}
                          onChange={() => togglePrimary(userId)}
                          disabled={primaryUsers.length === 1 && checked}
                        />
                        {name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-500" htmlFor="rsvp-note">
                  עדכון סטטוס RSVP (יופיע כהערה באירועים קיימים)
                </label>
                <textarea
                  id="rsvp-note"
                  rows={3}
                  className="w-full border p-2 rounded bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  value={rsvpNote}
                  onChange={(e) => setRsvpNote(e.target.value)}
                  placeholder="לא אהיה זמין בתקופה הזו כי…"
                />
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoCancelHostedEvents}
                    onChange={(e) => setAutoCancelHostedEvents(e.target.checked)}
                  />
                  <span>בטל אירועים שאני מארח בתקופה זו</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoUpdateRsvps}
                    onChange={(e) => setAutoUpdateRsvps(e.target.checked)}
                  />
                  <span>עדכן RSVP באירועים שאני משתתף בהם ל"איני מגיע"</span>
                </label>
              </div>

              {saveError && (
                <div className="p-3 border border-red-200 bg-red-50 text-sm text-red-700 rounded">{saveError}</div>
              )}
              {lastImpact && (
                <div className="p-3 border border-green-200 bg-green-50 text-sm text-green-800 rounded space-y-2">
                  <div>החסימה נשמרה בהצלחה.</div>
                  {lastImpact.cancelledEvents.length > 0 && (
                    <div>
                      בוטלו {lastImpact.cancelledEvents.length} אירועים:
                      <ul className="list-disc list-inside">
                        {lastImpact.cancelledEvents.map((event) => (
                          <li key={event.id}>
                            {event.title} ({dateTime.format(new Date(event.startAt))})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lastImpact.updatedRsvps.length > 0 && (
                    <div>עודכנו {lastImpact.updatedRsvps.length} סטטוסי RSVP.</div>
                  )}
                  {lastImpact.cancelledEvents.length === 0 && lastImpact.updatedRsvps.length === 0 && (
                    <div>לא בוצעו שינויים באירועים קיימים.</div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                disabled={disabledSubmit}
              >
                {saving ? "שומר…" : "יצירת חסימה"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">חסימות פעילות</h2>
            {entries.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">אין חסימות פעילות כרגע.</div>
            ) : (
              <div className="grid gap-3">
                {entries.map((entry) => {
                  const participants = entry.participants
                    .map((p) => p.user?.name || p.user?.email || p.user?.id?.slice(0, 6) || "חבר ללא שם")
                    .join(", ");
                  return (
                    <article
                      key={entry.id}
                      className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 bg-white dark:bg-gray-900 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {entry.title || entry.reason || "חוסר זמינות"}
                          </h3>
                          <div className="text-xs text-gray-500">
                            {entry.scope === "FAMILY"
                              ? "כל המשפחה"
                              : entry.scope === "GROUP"
                              ? `קבוצה${entry.group?.nickname ? ` · ${entry.group.nickname}` : ""}`
                              : "חסימה פרטית"}
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{formatRange(entry.startAt, entry.endAt)}</span>
                      </div>
                      {entry.reason && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">{entry.reason}</div>
                      )}
                      <div className="text-xs text-gray-500">משתתפים: {participants}</div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

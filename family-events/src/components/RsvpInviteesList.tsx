"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Item = {
  id: string;
  status: string;
  note: string | null;
  user: {
    id: string;
    name: string | null;
    image?: string | null;
    groupId?: string | null;
    groupNickname?: string | null;
  };
};

type StatusKey = 'NA' | 'APPROVED' | 'DECLINED' | 'MAYBE';
type Feedback = { type: 'success' | 'error'; message: string };

type Props = {
  eventId: string;
  list: Item[];
  groupNotes?: Record<string, string>;
  canNotify?: boolean;
};

const STATUS_ORDER: StatusKey[] = ['NA', 'APPROVED', 'MAYBE', 'DECLINED'];
const STATUS_LABELS: Record<StatusKey, string> = {
  NA: 'לא השיבו',
  APPROVED: 'אגיע',
  MAYBE: 'אולי',
  DECLINED: 'לא אגיע',
};

type SelectionState = 'all' | 'some' | 'none';

type GroupEntry = {
  key: string;
  label: string;
  members: Item[];
  userIds: string[];
  isSingle: boolean;
  noteToDisplay: string | null;
};

type StatusSection = {
  status: StatusKey;
  label: string;
  members: Item[];
  groups: GroupEntry[];
};

function getSelectionState(userIds: string[], selected: Set<string>): SelectionState {
  if (!userIds.length) return 'none';
  const selectedCount = userIds.reduce((count, id) => (selected.has(id) ? count + 1 : count), 0);
  if (selectedCount === 0) return 'none';
  if (selectedCount === userIds.length) return 'all';
  return 'some';
}

function SectionSelectCheckbox({
  state,
  onChange,
  disabled,
}: {
  state: SelectionState;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'some';
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
      checked={state === 'all'}
      onChange={(event) => onChange(event.target.checked)}
      disabled={disabled}
    />
  );
}

function chipCls(status: string): string {
  if (status === 'APPROVED') {
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
  }
  if (status === 'DECLINED') {
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800';
  }
  if (status === 'MAYBE') {
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
}

export default function RsvpInviteesList({ eventId, list, groupNotes = {}, canNotify = false }: Props) {
  const [viewMode, setViewMode] = useState<'status' | 'group'>('status');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<StatusKey>>(() => new Set());

  const visibleUserIds = useMemo(
    () => list.map((item) => item.user?.id).filter((id): id is string => Boolean(id)),
    [list],
  );

  const statusSections = useMemo<StatusSection[]>(() => {
    const baseMap = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = { status, label: STATUS_LABELS[status], members: [] as Item[] };
      return acc;
    }, {} as Record<StatusKey, { status: StatusKey; label: string; members: Item[] }>);

    list.forEach((item) => {
      const statusKey = STATUS_ORDER.includes(item.status as StatusKey) ? (item.status as StatusKey) : 'NA';
      (baseMap[statusKey] || baseMap.NA).members.push(item);
    });

    return STATUS_ORDER.map((status) => {
      const section = baseMap[status];
      const groupMap = new Map<
        string,
        { key: string; label: string; members: Item[]; userIds: string[]; isSingle: boolean }
      >();

      section.members.forEach((member) => {
        const groupId = member.user.groupId || `__single-${member.user.id}`;
        const label =
          member.user.groupNickname || (member.user.groupId ? 'קבוצה ללא שם' : member.user.name || 'ללא קבוצה');
        const entry = groupMap.get(groupId);
        if (entry) {
          entry.members.push(member);
          if (member.user.id) entry.userIds.push(member.user.id);
        } else {
          groupMap.set(groupId, {
            key: groupId,
            label,
            members: [member],
            userIds: member.user.id ? [member.user.id] : [],
            isSingle: !member.user.groupId,
          });
        }
      });

      const groups: GroupEntry[] = Array.from(groupMap.values()).map((group) => {
        const notes = group.members
          .map((member) => (member.note || '').trim())
          .filter((note) => note.length > 0);
        const unifiedNote = notes.length > 0 && notes.every((note) => note === notes[0]) ? notes[0] : null;
        const groupLevelNote = !group.isSingle ? groupNotes[group.key] : null;
        const noteToDisplay = groupLevelNote || unifiedNote;
        const entry: GroupEntry = { ...group, noteToDisplay };
        return entry;
      });

      const sectionWithGroups: StatusSection = { ...section, groups };
      return sectionWithGroups;
    }).filter((section) => section.members.length > 0);
  }, [list, groupNotes]);

  const groupSections = useMemo<GroupEntry[]>(() => {
    const map = new Map<string, GroupEntry>();
    list.forEach((member) => {
      const groupId = member.user.groupId || `__single-${member.user.id}`;
      const label =
        member.user.groupNickname || (member.user.groupId ? 'קבוצה ללא שם' : member.user.name || 'ללא קבוצה');
      const existing = map.get(groupId);
      const userIds = member.user.id ? [member.user.id] : [];
      if (existing) {
        existing.members.push(member);
        existing.userIds.push(...userIds);
      } else {
        map.set(groupId, {
          key: groupId,
          label,
          members: [member],
          userIds: userIds.slice(),
          isSingle: !member.user.groupId,
          noteToDisplay: null,
        });
      }
    });

    return Array.from(map.values()).map((group) => {
      const notes = group.members
        .map((member) => (member.note || '').trim())
        .filter((note) => note.length > 0);
      const unifiedNote = notes.length > 0 && notes.every((note) => note === notes[0]) ? notes[0] : null;
      const groupLevelNote = !group.isSingle ? groupNotes[group.key] : null;
      const noteToDisplay = groupLevelNote || unifiedNote;
      return { ...group, noteToDisplay };
    });
  }, [list, groupNotes]);

  const selectedCount = selectedUserIds.size;
  const allVisibleSelected =
    selectionMode && visibleUserIds.length > 0 && visibleUserIds.every((id) => selectedUserIds.has(id));

  const toggleSelection = useCallback(
    (userId?: string | null) => {
      if (!selectionMode || !userId) return;
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    },
    [selectionMode],
  );

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!selectionMode) return;
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        if (checked) {
          visibleUserIds.forEach((id) => next.add(id));
        } else {
          visibleUserIds.forEach((id) => next.delete(id));
        }
        return next;
      });
    },
    [selectionMode, visibleUserIds],
  );

  const bulkSelect = useCallback(
    (userIds: string[], checked: boolean) => {
      if (!selectionMode) return;
      const ids = userIds.filter((id): id is string => Boolean(id));
      if (!ids.length) return;
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => {
          if (checked) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        return next;
      });
    },
    [selectionMode],
  );

  const toggleStatusSection = useCallback((status: StatusKey) => {
    setCollapsedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const startSelection = useCallback(() => {
    if (!canNotify || selectionMode) return;
    setFeedback(null);
    setSelectionMode(true);
  }, [canNotify, selectionMode]);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedUserIds(new Set());
    setIsSending(false);
    setFeedback(null);
  }, []);

  const handleSend = useCallback(async () => {
    if (!canNotify || isSending) return;
    const ids = Array.from(selectedUserIds).filter(Boolean);
    if (!ids.length) {
      setFeedback({ type: 'error', message: 'בחרו לפחות משתתף אחד לשליחת פוש.' });
      return;
    }
    setIsSending(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'ids', memberIds: ids }),
      });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch (_err) {
        // ignore json parse errors
      }
      if (!response.ok) {
        const message = payload?.error || 'שליחת הפוש נכשלה. נסו שוב.';
        throw new Error(message);
      }
      const successMessage =
        ids.length === 1 ? 'הודעת פוש נשלחה למוזמן שנבחר.' : `הודעת פוש נשלחה ל-${ids.length} מוזמנים.`;
      setFeedback({ type: 'success', message: successMessage });
      setSelectionMode(false);
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('[push] failed to send manual notification', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'שליחת הפוש נכשלה. נסו שוב.',
      });
    } finally {
      setIsSending(false);
    }
  }, [canNotify, eventId, isSending, selectedUserIds]);

  ;

  return (
    <div className="rounded border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">מוזמנים</h3>
          {selectionMode && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedCount ? `${selectedCount} נבחרו` : 'לא נבחרו משתתפים'}
            </span>
          )}
        </div>
        {canNotify && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {selectionMode ? (
              <>
                <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    onChange={(event) => toggleAll(event.target.checked)}
                    checked={allVisibleSelected}
                    disabled={isSending || visibleUserIds.length === 0}
                  />
                  <span>בחר הכל</span>
                </label>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSend}
                  disabled={isSending || selectedCount === 0}
                >
                  {isSending ? 'שולח...' : 'שלח'}
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={cancelSelection}
                  disabled={isSending}
                >
                  בטל
                </button>
              </>
            ) : (
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={startSelection}
                disabled={visibleUserIds.length === 0}
              >
                שליחת פוש
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-1">
          <button
            type="button"
            onClick={() => setViewMode('status')}
            className={`px-2 py-1 rounded ${
              viewMode === 'status'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            }`}
          >
            לפי סטטוס
          </button>
          <button
            type="button"
            onClick={() => setViewMode('group')}
            className={`px-2 py-1 rounded ${
              viewMode === 'group'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
            }`}
          >
            לפי קבוצה
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`text-xs rounded px-2 py-1 border ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {viewMode === 'status' ? (
        statusSections.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">אין מוזמנים בתצוגה זו.</p>
        ) : (
          <div className="space-y-3">
            {statusSections.map((section) => {
              const sectionUserIds = Array.from(new Set(section.groups.flatMap((group) => group.userIds)));
              const sectionSelectionState = getSelectionState(sectionUserIds, selectedUserIds);
              const isCollapsed = collapsedStatuses.has(section.status);

              return (
                <div key={section.status} className="border border-gray-100 dark:border-gray-800 rounded">
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <SectionSelectCheckbox
                          state={sectionSelectionState}
                          onChange={(checked) => bulkSelect(sectionUserIds, checked)}
                          disabled={sectionUserIds.length === 0}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => toggleStatusSection(section.status)}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300"
                        aria-expanded={!isCollapsed}
                      >
                        <span aria-hidden="true" className={`transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
                          &gt;
                        </span>
                        <span>
                          {section.label} · {section.members.length}{' '}
                          {section.members.length === 1 ? 'משתתף' : 'משתתפים'}
                        </span>
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="space-y-3 px-3 pb-3">
                      {section.groups.map((group, groupIndex) => {
                        const groupSelectionState = getSelectionState(group.userIds, selectedUserIds);
                        const noteToDisplay = group.noteToDisplay;
                        const isFirstGroup = groupIndex === 0;
                        const showHeader = selectionMode || !isFirstGroup || group.members.length > 1;

                        return (
                          <div
                            key={group.key}
                            className={groupIndex > 0 ? 'border-t border-gray-100 dark:border-gray-800 pt-3 mt-3' : ''}
                          >
                            {showHeader && (
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <div className="flex items-center gap-2">
                                  {selectionMode && (
                                    <SectionSelectCheckbox
                                      state={groupSelectionState}
                                      onChange={(checked) => bulkSelect(group.userIds, checked)}
                                      disabled={group.userIds.length === 0}
                                    />
                                  )}
                                  {isFirstGroup ? (
                                    <span className="sr-only">{group.label || 'קבוצה'}</span>
                                  ) : (
                                    <span>{group.label || 'קבוצה'}</span>
                                  )}
                                </div>
                                {group.members.length > 1 ? <span>{group.members.length} משתתפים</span> : null}
                              </div>
                            )}
                            {noteToDisplay && (
                              <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded px-2 py-1 mb-2">
                                “{noteToDisplay}”
                              </div>
                            )}
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                              {group.members.map((member) => {
                                const userId = member.user.id;
                                const checked = userId ? selectedUserIds.has(userId) : false;
                                const memberNote = member.note?.trim();

                                return (
                                  <li
                                    key={member.id}
                                    className={`py-2 px-2 ${
                                      selectionMode && checked ? 'bg-indigo-50 dark:bg-indigo-900/30 rounded-md' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {selectionMode && (
                                        <input
                                          type="checkbox"
                                          className="mt-1 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                          checked={checked}
                                          onChange={() => toggleSelection(userId)}
                                        />
                                      )}
                                      <img
                                        src={
                                          member.user?.image && /^https?:/i.test(member.user.image)
                                            ? member.user.image
                                            : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(
                                                member.user?.name || 'user',
                                              )}`
                                        }
                                        alt="user"
                                        className="w-7 h-7 rounded-full"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm truncate">{member.user?.name || '—'}</span>
                                          <span className={`text-xs rounded px-2 py-0.5 border ${chipCls(member.status)}`}>
                                            {
                                              STATUS_LABELS[
                                                STATUS_ORDER.includes(member.status as StatusKey)
                                                  ? (member.status as StatusKey)
                                                  : 'NA'
                                              ]
                                            }
                                          </span>
                                        </div>
                                        {memberNote && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                                            “{memberNote}”
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : groupSections.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">אין מוזמנים בתצוגה זו.</p>
        ) : (
          <div className="space-y-3">
            {groupSections.map((group) => {
              const groupSelectionState = getSelectionState(group.userIds, selectedUserIds);
              const noteToDisplay = group.noteToDisplay;

              return (
                <div key={group.key} className="border border-gray-100 dark:border-gray-800 rounded">
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <SectionSelectCheckbox
                          state={groupSelectionState}
                          onChange={(checked) => bulkSelect(group.userIds, checked)}
                          disabled={group.userIds.length === 0}
                        />
                      )}
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {group.label || 'קבוצה'} · {group.members.length}{' '}
                        {group.members.length === 1 ? 'משתתף' : 'משתתפים'}
                      </span>
                    </div>
                  </div>
                  {noteToDisplay && (
                    <div className="mx-3 mb-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded px-2 py-1">
                      “{noteToDisplay}”
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {group.members.map((member) => {
                      const userId = member.user.id;
                      const checked = userId ? selectedUserIds.has(userId) : false;
                      const memberNote = member.note?.trim();

                      return (
                        <li
                          key={member.id}
                          className={`py-2 px-3 ${
                            selectionMode && checked ? 'bg-indigo-50 dark:bg-indigo-900/30 rounded-md' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {selectionMode && (
                              <input
                                type="checkbox"
                                className="mt-1 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                checked={checked}
                                onChange={() => toggleSelection(userId)}
                              />
                            )}
                            <img
                              src={
                                member.user?.image && /^https?:/i.test(member.user.image)
                                  ? member.user.image
                                  : `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(
                                      member.user?.name || 'user',
                                    )}`
                              }
                              alt="user"
                              className="w-7 h-7 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm truncate">{member.user?.name || '—'}</span>
                                <span className={`text-xs rounded px-2 py-0.5 border ${chipCls(member.status)}`}>
                                  {
                                    STATUS_LABELS[
                                      STATUS_ORDER.includes(member.status as StatusKey)
                                        ? (member.status as StatusKey)
                                        : 'NA'
                                    ]
                                  }
                                </span>
                              </div>
                              {memberNote && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                                  “{memberNote}”
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


"use client";
import { useMemo, useState } from "react";

export type GroupNode = {
  id: string;
  nickname: string;
  parentId: string | null;
  members: { id: string; name: string | null }[];
};

export default function GroupTree({ groups }: { groups: GroupNode[] }) {
  const byParent = useMemo(() => buildTreeIndex(groups), [groups]);
  const roots = byParent.get(null) || [];
  return (
    <div className="space-y-2">
      {roots.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-300 text-sm">אין קבוצות עדיין.</div>
      ) : (
        roots.map((g) => <TreeItem key={g.id} node={g} byParent={byParent} level={0} />)
      )}
    </div>
  );
}

function TreeItem({ node, byParent, level }: { node: GroupNode; byParent: Map<string | null, GroupNode[]>; level: number }) {
  const children = byParent.get(node.id) || [];
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div className="flex items-center gap-2">
        {children.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="w-6 h-6 flex items-center justify-center rounded border text-xs">
            {open ? "−" : "+"}
          </button>
        )}
        {children.length === 0 && <span className="w-6" />}
        <div className="flex-1 rounded border border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="font-medium">{node.nickname}</div>
            <div className="text-xs text-gray-500">{node.members.length} חברים</div>
          </div>
          {node.members.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {node.members.slice(0, 6).map((m) => (
                <span key={m.id} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">{m.name ?? m.id.slice(0, 6)}</span>
              ))}
              {node.members.length > 6 && (
                <span className="text-xs text-gray-500">+{node.members.length - 6}</span>
              )}
            </div>
          )}
        </div>
      </div>
      {open && children.length > 0 && (
        <div className="ml-8 mt-2 space-y-2">
          {children.map((c) => (
            <TreeItem key={c.id} node={c} byParent={byParent} level={level + 1} />)
          )}
        </div>
      )}
    </div>
  );
}

function buildTreeIndex(groups: GroupNode[]) {
  const map = new Map<string | null, GroupNode[]>();
  for (const g of groups) {
    const key = (g.parentId as string | null) ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return map;
}


// Simplified port of packages/components/ui/src/FormElements/MultiSelect/utils.ts
// Flat-list only (no group/children nodes) — enough to demonstrate the
// O(options) cost that PR #6016 moved into `startTransition`.
import type { OptionNode } from './components/Option';

export const toggleOption = (id: string, selected: Set<string>): Set<string> => {
  const next = new Set(selected);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
};

export const filterOptions = (options: OptionNode[], term: string): OptionNode[] => {
  if (!term.trim()) return options;
  const lower = term.toLowerCase();
  return options.filter((o) => o.label.toLowerCase().includes(lower));
};

export type MultiSelectValue = {
  selectedOptions: OptionNode[];
};

// Deliberately an O(options) walk, same shape as the real
// `computeMultiSelectValue` — this is the "heavy number crunching" PR #6016
// moved out of the synchronous click handler via `startTransition`.
export const computeMultiSelectValue = (
  selected: Set<string>,
  options: OptionNode[]
): MultiSelectValue => ({
  selectedOptions: options.filter((o) => selected.has(o.id)),
});

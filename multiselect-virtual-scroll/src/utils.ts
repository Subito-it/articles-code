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

// Deliberately an O(options) walk — the "heavy number crunching" moved
// out of the synchronous click handler via `startTransition`.
export const computeMultiSelectValue = (
  selected: Set<string>,
  options: OptionNode[]
): MultiSelectValue => ({
  selectedOptions: options.filter((o) => selected.has(o.id)),
});

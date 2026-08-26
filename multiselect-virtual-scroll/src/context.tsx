// Port of packages/components/ui/src/FormElements/MultiSelect/context.ts
//
// This is the piece that makes the PR #6016 memoization strategy actually
// work: selection state (`internalSelected`) is read via context inside each
// Option, not passed down as a prop. That means an Option's own props (its
// `node`) stay referentially stable across clicks, so `React.memo` on
// `Option` (comparing only `node` identity) and on `MenuList` (comparing
// only child count) aren't defeated by the checked-state change itself —
// only the components that actually read the context re-render when
// selection changes.
import { createContext, useContext } from 'react';

export type MultiSelectContextValue = {
  internalSelected: Set<string>;
  onToggle: (id: string) => void;
  hasResults: boolean;
  isSearchEnabled: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  emptyLabel: string;
};

const MultiSelectContext = createContext<MultiSelectContextValue | null>(
  null
);

export const MultiSelectProvider = MultiSelectContext.Provider;

export const useMultiSelect = (): MultiSelectContextValue => {
  const ctx = useContext(MultiSelectContext);

  if (!ctx) {
    throw new Error(
      'useMultiSelect hook must be used within MultiSelectProvider'
    );
  }

  return ctx;
};

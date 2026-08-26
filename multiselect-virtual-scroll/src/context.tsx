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

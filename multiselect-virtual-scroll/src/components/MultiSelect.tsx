import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MultiSelectProvider } from '../context';
import { MenuList } from './MenuList';
import { Option, type OptionNode } from './Option';
import { computeMultiSelectValue, filterOptions, toggleOption } from '../utils';

type MultiSelectProps = {
  ariaLabel: string;
  options: OptionNode[];
  maxMenuHeight?: number;
  onSelectionChange?: (value: { selectedOptions: OptionNode[] }) => void;
};

export const MultiSelect = ({
  ariaLabel,
  options,
  maxMenuHeight = 260,
  onSelectionChange,
}: MultiSelectProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelected, setInternalSelected] = useState<Set<string>>(
    () => new Set()
  );

  // Ref keeps the latest internalSelected without forcing handleToggle to
  // change identity on every toggle.
  const internalSelectedRef = useRef(internalSelected);
  internalSelectedRef.current = internalSelected;

  const handleToggle = useCallback(
    (id: string) => {
      const next = toggleOption(id, internalSelectedRef.current);
      setInternalSelected(next);

      // The O(options) derived-value walk + the public callback are
      // deferred — not urgent for the checkbox to flip visually.
      startTransition(() => {
        onSelectionChange?.(computeMultiSelectValue(next, options));
      });
    },
    [options, onSelectionChange]
  );

  const filteredOptions = useMemo(
    () => filterOptions(options, searchTerm),
    [options, searchTerm]
  );

  const contextValue = useMemo(
    () => ({
      internalSelected,
      onToggle: handleToggle,
      hasResults: filteredOptions.length > 0,
      isSearchEnabled: true,
      searchTerm,
      onSearchChange: setSearchTerm,
      emptyLabel: 'No results.',
    }),
    [internalSelected, handleToggle, filteredOptions.length, searchTerm]
  );

  useEffect(() => {
    const onClickOutside = (evt: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(evt.target as Node)) {
        setMenuIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, []);

  return (
    <div className="select-wrapper" ref={wrapperRef}>
      <div
        className="control"
        role="button"
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={() => setMenuIsOpen((v) => !v)}
      >
        <span>
          {internalSelected.size > 0
            ? `${internalSelected.size} selected`
            : 'Select a brand...'}
        </span>
        <span>▾</span>
      </div>

      {menuIsOpen && (
        <MultiSelectProvider value={contextValue}>
          <MenuList maxHeight={maxMenuHeight}>
            {filteredOptions.map((node) => (
              <Option key={node.id} node={node} />
            ))}
          </MenuList>
        </MultiSelectProvider>
      )}
    </div>
  );
};

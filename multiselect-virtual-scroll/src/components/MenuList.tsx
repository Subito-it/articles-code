// Port of packages/components/ui/src/FormElements/MultiSelect/partials/MenuList.tsx
//
// In the real component, MenuList's only actual props are `children` and
// `maxHeight` (everything else it needs — searchTerm, hasResults, labels —
// comes from `useMultiSelect()` context, same as Option). That's exactly
// why the PR #6016 memo comparator only needs to check child *count* and
// `maxHeight`: any other change that should trigger a re-render already
// goes through the context subscription, bypassing memo entirely.
import { Children, memo, type CSSProperties, type ReactNode } from 'react';
import { useMultiSelect } from '../context';
import { useVirtualScroll } from '../hooks/useVirtualScroll';
import './MenuList.css';

type MenuListProps = {
  children: ReactNode;
  maxHeight: number;
};

const MenuListComponent = ({ children, maxHeight }: MenuListProps) => {
  const { hasResults, isSearchEnabled, searchTerm, onSearchChange, emptyLabel } =
    useMultiSelect();

  const { listboxRef, totalHeight, visibleChildren, offsetTop, handleScroll, totalCount, renderedCount } =
    useVirtualScroll({ children, hasResults, searchTerm, maxHeight });

  return (
    <div
      className="menuList"
      style={{ '--max-height': `${maxHeight}px` } as CSSProperties}
    >
      {isSearchEnabled && (
        <div className="searchWrapper">
          <input
            type="text"
            className="searchInput"
            placeholder="Search..."
            value={searchTerm}
            onChange={(evt) => onSearchChange(evt.target.value)}
          />
        </div>
      )}

      <div
        ref={listboxRef}
        role="listbox"
        className="listbox"
        onScroll={handleScroll}
      >
        {hasResults ? (
          <div
            role="presentation"
            className="virtualWindow"
            style={{ '--total-height': `${totalHeight}px` } as CSSProperties}
          >
            <div
              role="presentation"
              className="virtualOffset"
              style={{ '--offset-top': `${offsetTop}px` } as CSSProperties}
            >
              {visibleChildren}
            </div>
          </div>
        ) : (
          <div className="emptyState">{emptyLabel}</div>
        )}
      </div>

      <div className="statRow">
        {renderedCount} rows in DOM / {totalCount} total options
      </div>
    </div>
  );
};

export const MenuList = memo(
  MenuListComponent,
  (prev, next) =>
    Children.count(prev.children) === Children.count(next.children) &&
    prev.maxHeight === next.maxHeight
);

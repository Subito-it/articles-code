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

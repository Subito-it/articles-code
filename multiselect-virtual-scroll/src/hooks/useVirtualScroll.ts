// Faithful port of a real-world useVirtualScroll hook. Same params, same
// state shape, same window/overscan math, same rAF-batched scroll handler
// as the real fix
import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ITEM_HEIGHT_FALLBACK, OVERSCAN } from '../config';

type Params = {
  children: ReactNode;
  hasResults: boolean;
  searchTerm: string;
  maxHeight: number;
};

/**
 * Implements a virtual-scroll window over a list of option children.
 * Only renders the items visible within `maxHeight` plus an overscan buffer.
 */
export const useVirtualScroll = ({
  children,
  hasResults,
  searchTerm,
  maxHeight,
}: Params) => {
  const [scrollTop, setScrollTop] = useState(0);

  const [itemHeight, setItemHeight] = useState(ITEM_HEIGHT_FALLBACK);

  const listboxRef = useRef<HTMLDivElement>(null);

  // Coalesce rapid scroll events into one state update per frame, avoiding
  // redundant re-renders. See https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
  const rafRef = useRef(0);

  const childArray = useMemo(
    () => (hasResults ? Children.toArray(children) : []),
    [children, hasResults]
  );

  // Measure the actual rendered option height once after mount
  useLayoutEffect(() => {
    const el =
      listboxRef.current?.querySelector<HTMLElement>('[role="option"]');

    if (el) {
      const h = el.getBoundingClientRect().height;
      if (h) setItemHeight(h);
    }
  }, []);

  // Reset scroll when the search filter changes
  useLayoutEffect(() => {
    if (listboxRef.current) {
      listboxRef.current.scrollTop = 0;
    }

    setScrollTop(0);
  }, [searchTerm]);

  const handleScroll = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (listboxRef.current) {
          setScrollTop(listboxRef.current.scrollTop);
        }

        rafRef.current = 0;
      });
    }
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // --- Virtual-window calculation
  const totalCount = childArray.length;
  const totalHeight = totalCount * itemHeight;

  // Clamp scrollTop when the list shrinks (e.g. after a search filter)
  const effectiveScrollTop = scrollTop > totalHeight ? 0 : scrollTop;

  const startIdx = Math.max(
    0,
    Math.floor(effectiveScrollTop / itemHeight) - OVERSCAN
  );

  const endIdx = Math.min(
    totalCount,
    Math.ceil((effectiveScrollTop + maxHeight) / itemHeight) + OVERSCAN
  );

  const visibleChildren = childArray.slice(startIdx, endIdx);
  const offsetTop = startIdx * itemHeight;

  return {
    listboxRef,
    totalHeight,
    visibleChildren,
    offsetTop,
    handleScroll,
    totalCount,
    renderedCount: visibleChildren.length,
  };
};

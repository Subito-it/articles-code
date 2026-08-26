// Ported from a real-world MultiSelect config. Names and values kept
// identical; unrelated static react-select config (STATIC_COMPONENTS/
// STATIC_STYLES) was dropped — this demo doesn't depend on react-select.

// Matches the resolved value of the original design system's option row
// height token. Kept as a plain px fallback here.
export const ITEM_HEIGHT_FALLBACK = 32;

// Number of extra items rendered above and below the visible window to
// prevent blank flashes during fast scrolling.
export const OVERSCAN = 5;

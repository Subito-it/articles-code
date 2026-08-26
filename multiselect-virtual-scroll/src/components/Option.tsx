// Port of packages/components/ui/src/FormElements/MultiSelect/partials/Option.tsx
// Simplified (plain checkbox instead of the design system's Radix checkbox,
// no group/indeterminate state) but keeps the real memoization strategy from
// PR #6016: the comparator only checks `node` identity. `checked` is read
// from context inside the component, not passed as a prop — so a toggle
// elsewhere in the list doesn't change this Option's props and doesn't
// defeat the memo.
import { memo, type KeyboardEventHandler, type MouseEventHandler } from 'react';
import { useMultiSelect } from '../context';

export type OptionNode = {
  id: string;
  label: string;
};

type OptionProps = {
  node: OptionNode;
};

const OptionComponent = ({ node }: OptionProps) => {
  const { internalSelected, onToggle } = useMultiSelect();
  const checked = internalSelected.has(node.id);

  const handleClick: MouseEventHandler<HTMLDivElement> = (evt) => {
    evt.preventDefault();
    onToggle(node.id);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      onToggle(node.id);
    }
  };

  return (
    <div
      role="option"
      aria-selected={checked}
      tabIndex={0}
      className="option"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
      <span className="optionLabel">{node.label}</span>
    </div>
  );
};

export const Option = memo(
  OptionComponent,
  (prev, next) => prev.node === next.node
);

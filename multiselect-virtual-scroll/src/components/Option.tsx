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

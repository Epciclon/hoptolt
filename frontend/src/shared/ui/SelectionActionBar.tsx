import { Button } from './Button';

interface SelectionActionBarProps {
  count: number;
  itemName: string;
  buttonText: string;
  onRegister: () => void;
  isSubmitting?: boolean;
}

export function SelectionActionBar({ count, itemName, buttonText, onRegister, isSubmitting }: SelectionActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 shadow-xl border-2 border-primary-500 bg-theme-surface p-3 rounded-2xl flex items-center justify-between gap-6 max-w-[90vw] min-w-[300px]">
      <span className="text-main font-semibold px-2">
        {count} {itemName}{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}
      </span>
      <Button
        onClick={onRegister}
        disabled={count === 0}
        loading={isSubmitting}
        variant="primary"
      >
        {buttonText}
      </Button>
    </div>
  );
}

import { Button } from './Button';

interface SelectionActionBarProps {
  count: number;
  itemName: string;
  buttonText: string;
  mobileButtonText?: string;
  onRegister: () => void;
  isSubmitting?: boolean;
  isDisabled?: boolean;
}

function getSelectedText(itemName: string, count: number): string {
  const isFeminine = itemName.trim().toLowerCase().endsWith('a');
  const genderSuffix = isFeminine ? 'a' : 'o';
  const pluralSuffix = count === 1 ? '' : 's';
  return `seleccionad${genderSuffix}${pluralSuffix}`;
}

function getMobileButtonLabel(buttonText: string, mobileButtonText?: string): string {
  if (mobileButtonText) {
    return mobileButtonText;
  }
  if (buttonText.startsWith('Registrar ')) {
    return 'Registrar';
  }
  return buttonText;
}

export function SelectionActionBar({
  count,
  itemName,
  buttonText,
  mobileButtonText,
  onRegister,
  isSubmitting,
  isDisabled,
}: Readonly<SelectionActionBarProps>) {
  if (count === 0) return null;

  const pluralSuffix = count === 1 ? '' : 's';
  const selectedText = getSelectedText(itemName, count);
  const mobileLabel = getMobileButtonLabel(buttonText, mobileButtonText);

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 shadow-xl border-2 border-primary-500 bg-theme-surface px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2.5 sm:gap-6 w-auto max-w-[calc(100vw-5rem)] sm:max-w-none">
      {/* En pantallas moviles: solo el numero en una insignia compacta */}
      <div className="flex items-center sm:hidden shrink-0">
        <span
          className="flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs"
          title={`${count} ${itemName}${pluralSuffix} ${selectedText}`}
        >
          {count}
        </span>
      </div>

      {/* En pantallas medianas y grandes: texto completo descriptivo */}
      <span className="hidden sm:inline text-main font-semibold text-sm whitespace-nowrap px-1">
        {count} {itemName}{pluralSuffix} {selectedText}
      </span>

      <Button
        onClick={onRegister}
        disabled={count === 0 || isDisabled}
        loading={isSubmitting}
        variant="primary"
        size="sm"
        className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap shrink-0 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:shadow-none"
      >
        <span className="sm:hidden">{mobileLabel}</span>
        <span className="hidden sm:inline">{buttonText}</span>
      </Button>
    </div>
  );
}

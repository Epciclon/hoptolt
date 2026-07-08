'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Dialog, Button, Input } from '@/shared/ui';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';
import { genealogyService } from '@/modules/genealogy/services/genealogy.service';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Reproduction } from '../types/reproduction.types';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

interface WeaningWizardProps {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  reproduction: Reproduction;
  finishing?: boolean;
}

type WizardStep = 'ask' | 'count' | 'register';

export function WeaningWizard({ open, onClose, onFinish, reproduction, finishing }: Readonly<WeaningWizardProps>) {
  const { showToast } = useToast();
  const [step, setStep] = useState<WizardStep>('ask');
  const [keepCountStr, setKeepCountStr] = useState<string>('1');
  const keepCount = Math.max(1, Number.parseInt(keepCountStr) || 1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [willKeepKits, setWillKeepKits] = useState<boolean | null>(null);
  const [showEarlyFinishConfirm, setShowEarlyFinishConfirm] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentIndex, step]);

  const reset = () => {
    setStep('ask');
    setKeepCountStr('1');
    setCurrentIndex(0);
    setWillKeepKits(null);
  };

  const handleCloseAttempt = () => {
    if (currentIndex > 0) {
      setShowEarlyFinishConfirm(true);
    } else {
      reset();
      onClose();
    }
  };

  const handleConfirmEarlyFinish = () => {
    setShowEarlyFinishConfirm(false);
    onFinish();
    reset();
    onClose();
  };

  const handleCancelEarlyFinish = () => {
    setShowEarlyFinishConfirm(false);
  };

  const offspringInitialData: Partial<Rabbit> = {
    race: reproduction.femaleRace || '',
    birthDate: reproduction.estimatedBirthDate || '',
    purpose: 'Reproducción',
  };

  const handleNoKeep = () => {
    onFinish();
    handleCloseAttempt();
  };

  const handleRabbitRegistered = async (rabbit?: Rabbit) => {
    if (!rabbit) return;


    showToast('Enlazando árbol genealógico de la cría...', 'info');
    try {
      await genealogyService.register({
        rabbitId: rabbit.id,
        motherId: reproduction.femaleId || undefined,
        fatherId: reproduction.maleId || undefined,
      });
      showToast('Árbol genealógico actualizado exitosamente', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enlazar el árbol genealógico automáticamente.';
      showToast(msg, 'warning');
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < keepCount) {
      setCurrentIndex(nextIndex);
    } else {
      onFinish();
      handleCloseAttempt();
    }
  };

  const title = (() => {
    if (step === 'ask') {
      const namePart = reproduction.femaleName ? ` - ${reproduction.femaleName}` : '';
      return `Finalizar Ciclo de Lactancia: ${reproduction.femaleCode}${namePart}`;
    }
    if (step === 'count') {
      return 'Crías Retenidas';
    }
    return `Registrar Cría ${currentIndex + 1} de ${keepCount}`;
  })();

  return (
    <>
    <Dialog open={open && !showEarlyFinishConfirm} onClose={handleCloseAttempt} title={title} size="xl">
      <div className="p-4" ref={topRef}>

        {step === 'ask' && (
          <div className="flex flex-col gap-5">
            <p className="text-slate-600 text-sm leading-relaxed">
              Al finalizar, se registrará la separación oficial de la madre y los gazapos. La coneja volverá a estar receptiva para una nueva monta.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">¿Retendrás alguna cría de esta camada?</p>
                <p className="text-slate-500 text-xs mt-1">Por ejemplo, un pie de cría para reproducción o alguno para engorde.</p>
              </div>
              
              <div className="flex gap-3 mt-2 pl-7">
                <label className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 transition-colors flex-1 ${willKeepKits === false ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="keepKits" checked={willKeepKits === false} onChange={() => setWillKeepKits(false)} className="accent-primary-600" />
                  <span className="text-sm font-medium">No, ninguna</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 transition-colors flex-1 ${willKeepKits === true ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="keepKits" checked={willKeepKits === true} onChange={() => setWillKeepKits(true)} className="accent-primary-600" />
                  <span className="text-sm font-medium">Sí, me quedo con crías</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-2">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={finishing}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={() => {
                  if (willKeepKits) {
                    setStep('count');
                  } else {
                    handleNoKeep();
                  }
                }} 
                disabled={willKeepKits === null || finishing}
                loading={finishing && willKeepKits === false}
              >
                {willKeepKits === true ? (
                  <>Registrar Crías <ChevronRight size={16} /></>
                ) : (
                  'Finalizar Ciclo'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'count' && (
          <div className="flex flex-col gap-5">
            <p className="text-slate-900 font-medium text-sm">¿Cuántas crías retendrás? Las registraremos una por una.</p>
            <div className="py-4">
              <Input
                label="Cantidad de crías"
                type="number"
                min={1}
                max={reproduction.bornKits || 20}
                value={keepCountStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setKeepCountStr('');
                    return;
                  }
                  const num = Number.parseInt(val);
                  if (!Number.isNaN(num) && num >= 1) {
                    const maxAllowed = reproduction.bornKits || 20;
                    if (num > maxAllowed) {
                      setKeepCountStr(maxAllowed.toString());
                    } else {
                      setKeepCountStr(num.toString());
                    }
                  }
                }}
              />
              <p className="text-xs text-slate-500 mt-2">
                Máximo permitido: {reproduction.bornKits || 20} según los gazapos nacidos registrados
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setStep('ask')}>Atrás</Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => { setCurrentIndex(0); setStep('register'); }}
              >
                Continuar
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {step === 'register' && (
          <div className="flex flex-col gap-4">
            {keepCount > 1 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: keepCount }).map((_, i) => {
                  let colorClass = 'bg-slate-200';
                  if (i < currentIndex) colorClass = 'bg-green-400';
                  else if (i === currentIndex) colorClass = 'bg-primary-500';
                  
                  return (
                    <div
                      key={`step-${i}`}
                      className={`h-2 flex-1 rounded-full transition-colors duration-300 ${colorClass}`}
                    />
                  );
                })}
              </div>
            )}
            <RabbitForm
              mode="create"
              defaultValues={offspringInitialData}
              onSuccess={handleRabbitRegistered}
              onCancel={handleCloseAttempt}
              readOnlyRace={true}
            />
          </div>
        )}

      </div>
    </Dialog>
    
    <Dialog 
      open={showEarlyFinishConfirm} 
      onClose={handleCancelEarlyFinish}
      title="Finalizar anticipadamente"
      size="sm"
    >
      <div className="p-4 flex flex-col gap-4">
        <p className="text-slate-700 text-sm">
          Ya has registrado <strong>{currentIndex}</strong> cría(s) de las {keepCount} que indicaste.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-slate-600 text-xs">
            Si finalizas ahora, el ciclo de lactancia se cerrará y se conservarán únicamente las crías que ya guardaste.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="outline" onClick={handleCancelEarlyFinish}>
            Regresar y continuar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirmEarlyFinish}>
            Finalizar ciclo
          </Button>
        </div>
      </div>
    </Dialog>
    </>
  );
}

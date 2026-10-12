'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Dialog, Button, Input } from '@/shared/ui';
import { RabbitForm } from '@/modules/rabbits/components/RabbitForm';
import { genealogyService } from '@/modules/genealogy/services/genealogy.service';
import { reproductionService } from '../services/reproduction.service';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Reproduction } from '../types/reproduction.types';
import type { Rabbit } from '@/modules/rabbits/types/rabbit.types';

interface WeaningWizardProps {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  reproduction: Reproduction;
  finishing?: boolean;
  onKitsRegistered?: () => void;
}

type WizardStep = 'unregistered' | 'ask' | 'count' | 'register';

export function WeaningWizard({ open, onClose, onFinish, reproduction, finishing, onKitsRegistered }: Readonly<WeaningWizardProps>) {
  const { showToast } = useToast();
  
  const hasInitialKits = reproduction.bornKits !== null && reproduction.bornKits !== undefined;
  const [currentBornKits, setCurrentBornKits] = useState<number | null>(reproduction.bornKits ?? null);
  const [step, setStep] = useState<WizardStep>(hasInitialKits ? 'ask' : 'unregistered');
  const [unregisteredAction, setUnregisteredAction] = useState<'no' | 'yes' | null>(null);
  const [inputBornKits, setInputBornKits] = useState<string>('');
  const [savingKits, setSavingKits] = useState(false);

  const [keepCountStr, setKeepCountStr] = useState<string>('1');
  const keepCount = Math.max(1, Number.parseInt(keepCountStr) || 1);
  const stepKeys = useMemo(() => Array.from({ length: keepCount }, () => crypto.randomUUID()), [keepCount]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [willKeepKits, setWillKeepKits] = useState<boolean | null>(null);
  const [showEarlyFinishConfirm, setShowEarlyFinishConfirm] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentBornKits(reproduction.bornKits ?? null);
    setStep(reproduction.bornKits !== null && reproduction.bornKits !== undefined ? 'ask' : 'unregistered');
    setUnregisteredAction(null);
    setInputBornKits('');
    setKeepCountStr('1');
    setCurrentIndex(0);
    setWillKeepKits(null);
  }, [reproduction]);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentIndex, step]);

  const reset = () => {
    setCurrentBornKits(reproduction.bornKits ?? null);
    setStep(reproduction.bornKits !== null && reproduction.bornKits !== undefined ? 'ask' : 'unregistered');
    setUnregisteredAction(null);
    setInputBornKits('');
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

  const handleSaveBornKits = async () => {
    const num = Number.parseInt(inputBornKits);
    if (Number.isNaN(num) || num < 0) {
      showToast('Ingresa una cantidad válida de gazapos nacidos (0 o más).', 'error');
      return;
    }
    setSavingKits(true);
    try {
      await reproductionService.registerBirth(reproduction.id, { bornKits: num });
      setCurrentBornKits(num);
      showToast('Gazapos registrados exitosamente.', 'success');
      onKitsRegistered?.();
      if (num === 0) {
        onFinish();
        handleCloseAttempt();
      } else {
        setStep('ask');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error al registrar gazapos.', 'error');
    } finally {
      setSavingKits(false);
    }
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
    const namePart = reproduction.femaleName ? ` - ${reproduction.femaleName}` : '';
    if (step === 'unregistered' || step === 'ask') {
      return `Finalizar Ciclo de Lactancia: ${reproduction.femaleCode}${namePart}`;
    }
    if (step === 'count') {
      return 'Crías Retenidas';
    }
    return `Registrar Cría ${currentIndex + 1} de ${keepCount}`;
  })();

  const maxAllowedKits = Math.max(1, currentBornKits || 1);

  return (
    <>
    <Dialog open={open && !showEarlyFinishConfirm} onClose={handleCloseAttempt} title={title} size="xl">
      <div className="p-4" ref={topRef}>

        {/* Paso previo: La coneja no tiene gazapos registrados */}
        {step === 'unregistered' && (
          <div className="flex flex-col gap-5">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-main text-sm">No has registrado gazapos nacidos en esta camada</p>
                <p className="text-muted text-xs mt-1 leading-relaxed">
                  Antes de finalizar el ciclo de lactancia, puedes indicar cuántos gazapos nacieron para registrar posibles retenciones, o finalizar directamente si no hubo crías o no deseas registrarlas.
                </p>
              </div>
            </div>

            <div className="bg-theme-surface border border-strong rounded-xl p-4 flex flex-col gap-3">
              <p className="font-semibold text-main text-sm">¿Deseas registrar los gazapos nacidos ahora?</p>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                <label
                  className={`flex items-center gap-2.5 cursor-pointer border rounded-xl px-3.5 py-3 transition-all flex-1 ${
                    unregisteredAction === 'no'
                      ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:border-primary-400 dark:text-white shadow-sm ring-1 ring-primary-500/40'
                      : 'bg-card border-strong text-muted hover:bg-theme-surface hover:text-main'
                  }`}
                >
                  <input
                    type="radio"
                    name="unregisteredKitsOption"
                    checked={unregisteredAction === 'no'}
                    onChange={() => setUnregisteredAction('no')}
                    className="accent-primary-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium">No, finalizar ciclo directamente</span>
                </label>
                <label
                  className={`flex items-center gap-2.5 cursor-pointer border rounded-xl px-3.5 py-3 transition-all flex-1 ${
                    unregisteredAction === 'yes'
                      ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:border-primary-400 dark:text-white shadow-sm ring-1 ring-primary-500/40'
                      : 'bg-card border-strong text-muted hover:bg-theme-surface hover:text-main'
                  }`}
                >
                  <input
                    type="radio"
                    name="unregisteredKitsOption"
                    checked={unregisteredAction === 'yes'}
                    onChange={() => setUnregisteredAction('yes')}
                    className="accent-primary-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium">Sí, registrar gazapos nacidos</span>
                </label>
              </div>

              {unregisteredAction === 'yes' && (
                <div className="mt-3 pt-3 border-t border-default animate-in fade-in duration-200">
                  <Input
                    label="Cantidad de gazapos nacidos"
                    type="number"
                    min={0}
                    value={inputBornKits}
                    onChange={(e) => setInputBornKits(e.target.value)}
                    placeholder="Ej: 6"
                    autoFocus
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Se guardará la camada y luego podrás indicar si retienes crías.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-2">
              <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={savingKits || finishing}>
                Cancelar
              </Button>
              {unregisteredAction === 'yes' ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveBornKits}
                  disabled={inputBornKits === '' || savingKits}
                  loading={savingKits}
                >
                  Guardar y Continuar
                  <ChevronRight size={16} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNoKeep}
                  disabled={unregisteredAction === null || finishing}
                  loading={finishing}
                >
                  Finalizar Ciclo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Paso 1: Preguntar si retiene crías (solo si tiene crías registradas) */}
        {step === 'ask' && (
          <div className="flex flex-col gap-5">
            {currentBornKits === 0 ? (
              <>
                <p className="text-muted text-sm leading-relaxed">
                  Esta camada no cuenta con crías vivas registradas (0 gazapos). Al finalizar, la coneja volverá a estar receptiva para una nueva monta.
                </p>
                <div className="flex gap-3 justify-end mt-2">
                  <Button type="button" variant="outline" onClick={handleCloseAttempt} disabled={finishing}>
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="primary" 
                    onClick={handleNoKeep}
                    disabled={finishing}
                    loading={finishing}
                  >
                    Finalizar Ciclo
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted text-sm leading-relaxed">
                  Al finalizar, se registrará la separación de la madre y los gazapos. La coneja volverá a estar receptiva para una nueva monta.
                </p>
                <div className="bg-theme-surface border border-strong rounded-xl p-4 flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-main text-sm">¿Retendrás alguna cría de esta camada?</p>
                    <p className="text-muted text-xs mt-1">
                      Camada registrada: <strong>{currentBornKits} gazapo{currentBornKits !== 1 ? 's' : ''}</strong>. Puedes quedarte con pie de cría o engorde.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <label
                      className={`flex items-center gap-2.5 cursor-pointer border rounded-xl px-3.5 py-3 transition-all flex-1 ${
                        willKeepKits === false
                          ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:border-primary-400 dark:text-white shadow-sm ring-1 ring-primary-500/40'
                          : 'bg-card border-strong text-muted hover:bg-theme-surface hover:text-main'
                      }`}
                    >
                      <input
                        type="radio"
                        name="keepKits"
                        checked={willKeepKits === false}
                        onChange={() => setWillKeepKits(false)}
                        className="accent-primary-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm font-medium">No, ninguna</span>
                    </label>
                    <label
                      className={`flex items-center gap-2.5 cursor-pointer border rounded-xl px-3.5 py-3 transition-all flex-1 ${
                        willKeepKits === true
                          ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:border-primary-400 dark:text-white shadow-sm ring-1 ring-primary-500/40'
                          : 'bg-card border-strong text-muted hover:bg-theme-surface hover:text-main'
                      }`}
                    >
                      <input
                        type="radio"
                        name="keepKits"
                        checked={willKeepKits === true}
                        onChange={() => setWillKeepKits(true)}
                        className="accent-primary-500 w-4 h-4 cursor-pointer"
                      />
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
              </>
            )}
          </div>
        )}

        {/* Paso 2: Indicar cuántas crías retendrá (máximo real currentBornKits) */}
        {step === 'count' && (
          <div className="flex flex-col gap-5">
            <p className="text-main font-medium text-sm">¿Cuántas crías retendrás? Las registraremos una por una.</p>
            <div className="py-4">
              <Input
                label="Cantidad de crías"
                type="number"
                min={1}
                max={maxAllowedKits}
                value={keepCountStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setKeepCountStr('');
                    return;
                  }
                  const num = Number.parseInt(val);
                  if (!Number.isNaN(num) && num >= 1) {
                    if (num > maxAllowedKits) {
                      setKeepCountStr(maxAllowedKits.toString());
                    } else {
                      setKeepCountStr(num.toString());
                    }
                  }
                }}
              />
              <p className="text-xs text-muted mt-2">
                Máximo permitido: {maxAllowedKits} según los gazapos nacidos registrados
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
                {stepKeys.map((key, i) => {
                  let colorClass = 'bg-slate-200 dark:bg-slate-700';
                  if (i < currentIndex) colorClass = 'bg-green-500 dark:bg-green-600';
                  else if (i === currentIndex) colorClass = 'bg-primary-500 dark:bg-primary-400';
                  
                  return (
                    <div
                      key={key}
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
        <p className="text-main text-sm">
          Ya has registrado <strong>{currentIndex}</strong> cría(s) de las {keepCount} que indicaste.
        </p>
        <div className="bg-theme-surface border border-strong rounded-xl p-3">
          <p className="text-muted text-xs">
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

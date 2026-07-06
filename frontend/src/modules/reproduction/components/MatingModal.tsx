import { useState, useEffect } from 'react';
import { Dialog, Button, Alert, ConfirmDialog } from '@/shared/ui';
import { FilterBar } from '@/shared/ui/FilterBar';
import { useToast } from '@/shared/contexts/ToastContext';
import { reproductionService } from '../services/reproduction.service';
import { genealogyService } from '@/modules/genealogy/services/genealogy.service';
import type { MatingRabbit } from '../types/reproduction.types';
import { HeartHandshake } from 'lucide-react';

interface MatingModalProps {
  male: MatingRabbit;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatingModal({ male, onClose, onSuccess }: MatingModalProps) {
  const [females, setFemales] = useState<MatingRabbit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmFemale, setConfirmFemale] = useState<MatingRabbit | null>(null);
  const [showConsanguinityWarning, setShowConsanguinityWarning] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchFemales = async () => {
      try {
        setLoading(true);
        const data = await reproductionService.getAvailableFemalesForMating(male.id);
        setFemales(data);
      } catch (error) {
        console.error(error);
        showToast('Error al buscar hembras compatibles', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchFemales();
  }, [male.id]);

  const handlePreConfirm = async () => {
    if (!confirmFemale) return;
    setProcessingId(confirmFemale.id);
    try {
      const areRelated = await genealogyService.checkConsanguinity(male.id, confirmFemale.id);
      if (areRelated) {
        setShowConsanguinityWarning(true);
        setProcessingId(null);
      } else {
        await executeMating();
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al verificar consanguinidad.', 'error');
      setProcessingId(null);
    }
  };

  const executeMating = async () => {
    if (!confirmFemale) return;
    setProcessingId(confirmFemale.id);
    try {
      await reproductionService.startMating({ maleId: male.id, femaleId: confirmFemale.id });
      showToast('¡Monta iniciada exitosamente! La coneja ahora está con el macho.', 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.message || 'Error al iniciar la monta', 'error');
    } finally {
      setProcessingId(null);
      setConfirmFemale(null);
      setShowConsanguinityWarning(false);
    }
  };

  const filteredFemales = females.filter(female => {
    const safeCode = female.code ? female.code.toLowerCase() : '';
    const safeName = female.name ? female.name.toLowerCase() : '';
    const safeCage = female.cageNumber ? female.cageNumber.toString() : '';
    const safeSearch = search ? search.toLowerCase() : '';

    return safeCode.includes(safeSearch) || safeName.includes(safeSearch) || safeCage.includes(safeSearch);
  });

  return (
    <Dialog open={true} onClose={onClose} title="Seleccionar Hembra para Monta" size="3xl">
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-4 items-center">
        {male.imageUrl ? (
          <img src={male.imageUrl} alt={male.code} className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-primary-100" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
            Macho
          </div>
        )}
        <div>
          <h4 className="font-semibold text-slate-800 text-lg">{male.code} {male.name ? `- ${male.name}` : ''}</h4>
          <p className="text-sm text-slate-600">Raza: <span className="font-medium capitalize">{male.race}</span> | Jaula: <span className="font-medium">#{male.cageNumber}</span></p>
          <p className="text-xs text-slate-500 mt-1">Solo se muestran hembras receptivas iguales o mayores a 4 meses de la misma raza.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : females.length === 0 ? (
        <Alert 
          variant="warning" 
          message={`No se encontraron hembras de raza ${male.race} receptivas para monta (mayores de 4 meses con jaula).`}
          className="my-4"
        />
      ) : (
        <>
          <div className="mb-4">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar hembra por código, nombre o jaula..."
            />
          </div>

          {filteredFemales.length === 0 ? (
            <p className="text-sm text-center text-slate-500 py-8 bg-slate-50 rounded-lg border border-slate-100">
              No se encontraron hembras que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1 pr-2">
              {filteredFemales.map(female => (
                <div key={female.id} className="border border-slate-200 bg-white rounded-lg p-3 hover:border-primary-300 transition-colors flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                {female.imageUrl ? (
                  <img src={female.imageUrl} alt={female.code} className="w-10 h-10 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] text-center leading-tight px-1">
                    Sin foto
                  </div>
                )}
                <div>
                  <h5 className="font-medium text-slate-800">
                    {female.name ? `${female.name} — ${female.code}` : female.code}
                  </h5>
                  <p className="text-xs text-slate-500">Jaula #{female.cageNumber}</p>
                </div>
              </div>
              
              <Button 
                variant="primary" 
                size="sm"
                icon={<HeartHandshake size={14} />}
                loading={processingId === female.id}
                disabled={processingId !== null}
                onClick={() => setConfirmFemale(female)}
              >
                Vincular
              </Button>
            </div>
            ))}
          </div>
        )}
      </>
    )}
      {confirmFemale && !showConsanguinityWarning && (
        <ConfirmDialog
          open={!!confirmFemale && !showConsanguinityWarning}
          onClose={() => setConfirmFemale(null)}
          onConfirm={handlePreConfirm}
          loading={processingId !== null}
          title="Confirmar Monta"
          description={<>¿Estás seguro de que deseas vincular a la hembra <b>{confirmFemale.name ? `${confirmFemale.name} — ${confirmFemale.code}` : confirmFemale.code}</b> con el macho <b>{male.name ? `${male.name} — ${male.code}` : male.code}</b>?</>}
          confirmLabel="Sí, vincular"
          variant="primary"
        />
      )}

      {showConsanguinityWarning && (
        <Dialog open={true} onClose={() => setShowConsanguinityWarning(false)} title="ADVERTENCIA: Parentesco Detectado" size="md">
          <div className="flex flex-col gap-4 text-slate-700">
            <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-lg flex gap-3">
              <div className="text-sm">
                <p className="mb-2"><b>El cruce de conejos de la misma familia puede causar problemas de salud en las crías.</b></p>
                <p>Lo ideal es cruzar conejos sin ningún parentesco cercano en su árbol genealógico. Esta práctica ayuda a mantener crías fuertes y asegura camadas grandes y sanas.</p>
              </div>
            </div>
            <p className="text-sm">¿Deseas proceder de todos modos con esta monta y asumir los riesgos?</p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowConsanguinityWarning(false)}>
                Cancelar Monta
              </Button>
              <Button variant="danger" onClick={executeMating} loading={processingId !== null}>
                Proceder de todos modos
              </Button>
            </div>
          </div>
        </Dialog>
      )}
  </Dialog>
  );
}

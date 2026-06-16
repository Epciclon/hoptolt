'use client';

import { useState } from 'react';
import { GalponGuard } from '@/modules/galpones/components/GalponGuard';
import { ClipboardList } from 'lucide-react';
import { Card, CardHeader, Button, Dialog } from '@/shared/ui';
import { MortalityCatalog } from '@/modules/mortality/components/MortalityCatalog';
import { MortalityTable } from '@/modules/mortality/components/MortalityTable';

export default function MortalityPage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [catalogKey, setCatalogKey] = useState(0);
  const [tableKey, setTableKey] = useState(0);

  const handleSuccess = () => {
    setCatalogKey((k) => k + 1);
    setTableKey((k) => k + 1);
  };

  return (
    <GalponGuard>
      <Card>
        <CardHeader
          title="Controlar Mortalidad"
          subtitle="Registra la mortalidad y bajas del galpón activo"
          actions={
            <Button
              variant="outline"
              icon={<ClipboardList size={16} />}
              onClick={() => setHistoryOpen(true)}
            >
              Ver Historial de Bajas
            </Button>
          }
        />
        <div className="p-6 pt-0">
          <MortalityCatalog key={catalogKey} onSuccess={handleSuccess} />
        </div>

        <Dialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="Historial de Bajas por Mortalidad"
          description="Últimos registros de conejos fallecidos en el galpón activo"
          size="xl"
        >
          {historyOpen && (
            <MortalityTable key={tableKey} />
          )}
        </Dialog>
      </Card>
    </GalponGuard>
  );
}

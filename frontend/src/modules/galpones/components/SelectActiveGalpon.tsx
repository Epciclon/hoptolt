'use client';

import { useState } from 'react';
import { Button, Table } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { useGalpones } from '../hooks/useGalpones';
import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Galpon } from '../types/galpon.types';
import { getGalponBaseColumns } from '../utils/galponUtils';
import { FullScreenLoader } from '@/shared/ui';

export function SelectActiveGalpon() {
  const { galpones, loading } = useGalpones();
  const { activeGalpon, setActive } = useActiveGalpon();
  const { showToast } = useToast();
  const [selecting, setSelecting] = useState(false);

  const handleSelectGalpon = async (galpon: Galpon) => {
    setSelecting(true);
    await setActive(galpon.id);
    setSelecting(false);
  };

  const columns: Column<Galpon>[] = [
    ...getGalponBaseColumns(),
    {
      key: 'active',
      header: 'Estado',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          activeGalpon?.id === row.id
            ? 'bg-green-100 text-green-800'
            : 'bg-theme-surface border border-default text-muted'
        }`}>
          {activeGalpon?.id === row.id ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (row) => (
        <Button
          size="sm"
          variant={activeGalpon?.id === row.id ? 'secondary' : 'primary'}
          onClick={() => handleSelectGalpon(row)}
          disabled={activeGalpon?.id === row.id || selecting}
          loading={selecting}
        >
          {activeGalpon?.id === row.id ? 'Seleccionado' : 'Seleccionar'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {selecting && (
        <FullScreenLoader message="Cambiando galpón..." />
      )}

      {activeGalpon && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Galpón activo:</strong> {activeGalpon.name} ({activeGalpon.location})
          </p>
        </div>
      )}

      <Table<Galpon>
        columns={columns}
        data={galpones}
        loading={loading}
        rowKey={(row) => row.id}
        emptyMessage="No hay galpones registrados."
        isRowActive={(row) => activeGalpon?.id === row.id}
      />
    </div>
  );
}

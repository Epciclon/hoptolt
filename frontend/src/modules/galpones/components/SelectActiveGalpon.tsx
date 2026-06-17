'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui';
import type { Column } from '@/shared/ui/Table';
import { Table } from '@/shared/ui';
import { useGalpones } from '../hooks/useGalpones';
import { useActiveGalpon } from '../hooks/useActiveGalpon';
import { useToast } from '@/shared/contexts/ToastContext';
import type { Galpon } from '../types/galpon.types';

export function SelectActiveGalpon() {
  const { galpones, loading, error } = useGalpones();
  const { activeGalpon, setActive } = useActiveGalpon();
  const { showToast } = useToast();
  const [selecting, setSelecting] = useState(false);

  const handleSelectGalpon = async (galpon: Galpon) => {
    setSelecting(true);
    const success = await setActive(galpon.id);
    if (success) {
      showToast(`Galpón "${galpon.name}" seleccionado como activo.`, 'success');
    }
    setSelecting(false);
  };

  const columns: Column<Galpon>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'location', header: 'Ubicación' },
    { key: 'totalCapacity', header: 'Capacidad' },
    {
      key: 'active',
      header: 'Estado',
      render: (row) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          activeGalpon?.id === row.id
            ? 'bg-green-100 text-green-800'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {activeGalpon?.id === row.id ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          variant={activeGalpon?.id === row.id ? 'secondary' : 'primary'}
          onClick={() => handleSelectGalpon(row)}
          disabled={activeGalpon?.id === row.id || selecting}
        >
          {activeGalpon?.id === row.id ? 'Seleccionado' : 'Seleccionar'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
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
      />
    </div>
  );
}

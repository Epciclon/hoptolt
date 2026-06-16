import { useCallback, useState, useEffect } from 'react';
import { raceService } from '../services/race.service';
import type { Race } from '../types/race.types';

export function useRaces() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRaces = useCallback(async () => {
    try {
      setLoading(true);
      const data = await raceService.getAll();
      setRaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar razas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRaces();
  }, [loadRaces]);

  const deleteRace = useCallback(async (id: number) => {
    try {
      await raceService.delete(id);
      setRaces(races.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar raza');
    }
  }, [races]);

  return { races, loading, error, loadRaces, deleteRace };
}

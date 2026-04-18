import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/MatingDelete.css';

const MatingDelete = () => {
    const [activeMatings, setActiveMatings] = useState([]);
    const [rabbitsData, setRabbitsData] = useState({}); // Para almacenar datos de conejos
    const [assignments, setAssignments] = useState([]); // Para almacenar asignaciones actuales
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [matingToDelete, setMatingToDelete] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchActiveMatings();
        fetchRabbitsData();
        fetchAssignments();
    }, []);

    const fetchActiveMatings = async () => {
        try {
            const res = await axios.get('/api/mating/active');
            console.log('Active matings data:', res.data); // Debug: ver estructura de datos
            setActiveMatings(res.data);
        } catch {
            setActiveMatings([]);
        }
    };

    const fetchRabbitsData = async () => {
        try {
            const res = await axios.get('/api/rabbits');
            console.log('Rabbits data:', res.data); // Debug: ver datos de conejos
            // Crear un objeto con código de conejo como clave para acceso rápido
            const rabbitsMap = {};
            res.data.forEach(rabbit => {
                rabbitsMap[rabbit.code] = rabbit;
            });
            setRabbitsData(rabbitsMap);
        } catch {
            setRabbitsData({});
        }
    };

    const fetchAssignments = async () => {
        try {
            const res = await axios.get('/api/assignments');
            console.log('Assignments data:', res.data); // Debug: ver asignaciones
            setAssignments(res.data);
        } catch {
            setAssignments([]);
        }
    };

    // Filtrar montas por código de coneja o raza y que tengan asignación activa
    const filteredMatings = Array.isArray(activeMatings)
        ? activeMatings.filter(mating => {
            if (!mating || !mating.rabbitCode) return false;
            
            // Verificar que el conejo tenga asignación activa
            const hasAssignment = assignments.some(assignment => 
                assignment.rabbitCode === mating.rabbitCode && assignment.status === 'asignado'
            );
            if (!hasAssignment) return false;
            
            // Filtrar solo las que tienen jaula asignada (doble verificación)
            if (!mating.cageNumber || mating.cageNumber === '' || mating.cageNumber === null) return false;
            
            const searchTerm = filter.toLowerCase().trim();
            const code = mating.rabbitCode.toLowerCase();
            
            // Obtener datos del conejo desde rabbitsData
            const rabbitData = rabbitsData[mating.rabbitCode];
            const race = (rabbitData?.race || rabbitData?.breed || '').toLowerCase();
            
            return code.includes(searchTerm) || race.includes(searchTerm);
        })
        : [];

    const handleDelete = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await axios.delete(`/api/mating/${matingToDelete._id}`);
            setMessage('El parto ha sido eliminado con éxito.');
            setShowDeleteConfirm(false);
            setMatingToDelete(null);
            fetchActiveMatings();
            fetchRabbitsData(); // Actualizar datos de conejos también
            fetchAssignments(); // Actualizar asignaciones también
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar el parto.');
        }
        setLoading(false);
    };

    return (
        <div className="mating-delete-container">
            <div className="mating-delete-card">
                <h2>Eliminar Parto</h2>
                {error && <p className="mating-delete-error-msg">{error}</p>}
                {message && <p className="mating-delete-success-msg">{message}</p>}
                
                {/* Buscador por código o raza */}
                <div className="mating-delete-filter-group">
                    <label>Filtrar por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>

                <div className="mating-delete-table-responsive">
                    <table className="mating-delete-table">
                        <thead>
                            <tr>
                                <th>Jaula</th>
                                <th>Código</th>
                                <th>Raza</th>
                                <th>Fecha de Monta</th>
                                <th>Fecha de Parto</th>
                                <th>Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMatings.map(m => {
                                const rabbitData = rabbitsData[m.rabbitCode];
                                return (
                                    <tr key={m._id}>
                                        <td>{m.cageNumber}</td>
                                        <td>{m.rabbitCode}</td>
                                        <td>{rabbitData?.race || rabbitData?.breed || 'N/A'}</td>
                                        <td>{m.matingDate?.slice(0, 10)}</td>
                                        <td>{m.birthDate?.slice(0, 10)}</td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => {
                                                    setMatingToDelete(m);
                                                    setShowDeleteConfirm(true);
                                                    setError('');
                                                    setMessage('');
                                                }}
                                                disabled={loading}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredMatings.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>
                                        {filter ? 'No se encontraron partos que coincidan con la búsqueda.' : 'No hay partos activos.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Modal de confirmación para eliminar */}
                {showDeleteConfirm && (
                    <div className="modal-success">
                        <div className="modal-success-content">
                            <div className="modal-success-icon">❓</div>
                            <div>
                                ¿Está seguro que desea eliminar el parto de la coneja <b>{matingToDelete?.rabbitCode}</b>?
                            </div>
                            <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    className="confirm-btn"
                                    onClick={handleDelete}
                                    disabled={loading}
                                >
                                    Confirmar
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatingDelete;

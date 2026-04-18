import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/AssignRabbitCage.css';

const AssignRabbitCage = () => {
    const [cages, setCages] = useState([]);
    const [rabbits, setRabbits] = useState([]);
    const [selectedCage, setSelectedCage] = useState(null);
    const [selectedRabbits, setSelectedRabbits] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [rabbitFilter, setRabbitFilter] = useState('');
    const [cageNumberFilter, setCageNumberFilter] = useState('');

    // Estado para quitar asignación
    const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
    const [rabbitToUnassign, setRabbitToUnassign] = useState(null);

    // Cargar jaulas y conejos sin asignar usando las rutas correctas
    useEffect(() => {
        fetchCages();
        fetchRabbits();
        fetchAssignments();
    }, []);

    const fetchCages = async () => {
        try {
            const res = await axios.get('/api/cages');
            // Mapea los campos igual que en CageEdit
            setCages(res.data.map(c => ({
                cageNumber: c.number ?? c.cageNumber,
                cageType: (c.type ?? c.cageType)?.toLowerCase(),
                cageCapacity: c.capacity ?? c.cageCapacity
            })));
        } catch {
            setError('Error al cargar jaulas.');
        }
    };

    const fetchRabbits = async () => {
        try {
            const res = await axios.get('/api/rabbits');
            // Filtrar conejos ya asignados
            const assignedRes = await axios.get('/api/assignments');
            const assignedCodes = assignedRes.data.map(a => a.rabbitCode);
            setRabbits(res.data.filter(r => !assignedCodes.includes(r.code)));
        } catch {
            setError('Error al cargar conejos.');
        }
    };

    const fetchAssignments = async () => {
        try {
            const res = await axios.get('/api/assignments');
            setAssignments(res.data);
        } catch {
            setAssignments([]);
        }
    };

    const handleCageSelect = (cage) => {
        setSelectedCage(cage);
        setSelectedRabbits([]);
        setMessage('');
        setError('');
    };

    const handleRabbitSelect = (rabbit) => {
        if (!selectedCage) return;
        if (selectedRabbits.some(r => r.code === rabbit.code)) {
            setSelectedRabbits(selectedRabbits.filter(r => r.code !== rabbit.code));
        } else {
            if (selectedRabbits.length < selectedCage.cageCapacity) {
                setSelectedRabbits([...selectedRabbits, rabbit]);
            }
        }
    };

    const isRabbitSelected = (rabbit) => {
        return selectedRabbits.some(r => r.code === rabbit.code);
    };

    const handleAssign = () => {
        setMessage('');
        setError('');
        if (!selectedCage || selectedRabbits.length === 0) {
            setError('Seleccione una jaula y al menos un conejo.');
            return;
        }
        if (selectedRabbits.length > selectedCage.cageCapacity) {
            setError('No puede asignar más conejos que la capacidad de la jaula.');
            return;
        }
        setShowConfirm(true);
    };

    const confirmAssign = async () => {
        setShowConfirm(false);
        setLoading(true);
        setMessage('');
        setError('');
        try {
            // Asignar cada conejo usando la ruta correcta
            for (const rabbit of selectedRabbits) {
                await axios.post('/api/assign-rabbit', {
                    cageNumber: selectedCage.cageNumber,
                    rabbitCode: rabbit.code
                });
            }
            setMessage('Asignación realizada exitosamente.');
            setSelectedCage(null);
            setSelectedRabbits([]);
            fetchRabbits();
            fetchAssignments();
            // Mensaje temporal de éxito
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al asignar.');
        }
        setLoading(false);
    };

    // Quitar asignación de conejo
    const handleUnassign = async () => {
        setShowUnassignConfirm(false);
        setLoading(true);
        setError('');
        setMessage('');
        try {
            console.log('Eliminando asignación del conejo:', rabbitToUnassign);
            // Usar el endpoint POST actualizado que ahora elimina el registro completamente
            const response = await axios.post('/api/unassign', { rabbitCode: rabbitToUnassign });
            console.log('Respuesta del servidor:', response.data);
            setMessage('Asignación eliminada exitosamente.');
            setRabbitToUnassign(null);
            // Actualizar ambas listas para reflejar los cambios
            await fetchRabbits();
            await fetchAssignments();
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            console.error('Error al eliminar asignación:', err);
            setError(err.response?.data?.message || 'Error al eliminar asignación.');
        }
        setLoading(false);
    };

    // Agrupar asignaciones por jaula
    const assignmentsByCage = assignments.reduce((acc, a) => {
        if (!acc[a.cageNumber]) acc[a.cageNumber] = [];
        acc[a.cageNumber].push(a);
        return acc;
    }, {});

    // Calcular cuántos conejos hay en cada jaula
    const cageOccupancy = assignments.reduce((acc, a) => {
        acc[a.cageNumber] = (acc[a.cageNumber] || 0) + 1;
        return acc;
    }, {});

    // Solo mostrar jaulas que no estén llenas (capacidad disponible)
    const availableCages = cages.filter(cage =>
        (cageOccupancy[cage.cageNumber] || 0) < cage.cageCapacity
    );

    // Filtrar conejos por código o raza
    const filteredRabbits = Array.isArray(rabbits)
        ? rabbits.filter(rabbit =>
            rabbit &&
            rabbit.code &&
            (rabbit.code.toLowerCase().includes(rabbitFilter.toLowerCase().trim()) ||
             rabbit.race?.toLowerCase().includes(rabbitFilter.toLowerCase().trim()))
        )
        : [];

    // Filtrado de jaulas por número aplicado solo a jaulas disponibles (no llenas)
    const filteredCages = Array.isArray(availableCages)
        ? availableCages.filter(c =>
            c &&
            c.cageNumber !== undefined &&
            c.cageNumber !== null &&
            c.cageType &&
            c.cageCapacity &&
            c.cageNumber.toString().includes(cageNumberFilter.trim())
        )
        : [];

    return (
        <div className="assign-rabbit-container">
            <div className="assign-rabbit-flex">
                <div className="assign-rabbit-list">
                    <h3>Jaulas Disponibles</h3>
                    {/* Buscador de jaulas por número */}
                    <div className="filter-group" style={{ marginBottom: 10 }}>
                        <label htmlFor="cage-number-filter">Filtrar por número:</label>
                        <input
                            id="cage-number-filter"
                            type="text"
                            value={cageNumberFilter}
                            onChange={e => setCageNumberFilter(e.target.value)}
                            placeholder="Ej: 1"
                            style={{ marginLeft: 8 }}
                        />
                    </div>
                    <div className="assign-rabbit-attributes-list">
                        <span className="align-cell"><strong>Número de Jaula</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Tipo de Jaula</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Capacidad</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Ocupados</strong></span>
                    </div>
                    <ul>
                        {filteredCages.map(cage => (
                            <li
                                key={cage.cageNumber}
                                className={selectedCage && selectedCage.cageNumber === cage.cageNumber ? 'selected' : ''}
                                onClick={() => handleCageSelect(cage)}
                            >
                                <span className="align-cell">{cage.cageNumber}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{cage.cageType}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{cage.cageCapacity}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{cageOccupancy[cage.cageNumber] || 0}</span>
                            </li>
                        ))}
                        {filteredCages.length === 0 && (
                            <li>No hay jaulas disponibles.</li>
                        )}
                    </ul>
                </div>
                <div className="assign-rabbit-list">
                    <h3>Conejos Sin Asignar</h3>
                    {/* Formulario de búsqueda */}
                    <div className="filter-group" style={{ marginBottom: 10 }}>
                        <label htmlFor="rabbit-filter">Buscar por código o raza:</label>
                        <input
                            id="rabbit-filter"
                            type="text"
                            value={rabbitFilter}
                            onChange={e => setRabbitFilter(e.target.value)}
                            placeholder="Ej: R001 o Rex"
                            style={{ marginLeft: 8 }}
                        />
                    </div>
                    <div className="assign-rabbit-attributes-list">
                        <span className="align-cell"><strong>Código</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Raza</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Edad (meses)</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Sexo</strong></span>
                        <span className="vertical-divider" />
                        <span className="align-cell"><strong>Propósito</strong></span>
                    </div>
                    <ul>
                        {filteredRabbits.length === 0 && <li>No hay conejos disponibles.</li>}
                        {filteredRabbits.map(rabbit => (
                            <li
                                key={rabbit.code}
                                className={isRabbitSelected(rabbit) ? 'selected' : ''}
                                onClick={() => {
                                    if (selectedCage && (isRabbitSelected(rabbit) || selectedRabbits.length < selectedCage.cageCapacity)) {
                                        handleRabbitSelect(rabbit);
                                    }
                                }}
                                style={{
                                    cursor: selectedCage
                                        ? (isRabbitSelected(rabbit) || selectedRabbits.length < selectedCage.cageCapacity ? 'pointer' : 'not-allowed')
                                        : 'not-allowed',
                                    opacity: selectedCage
                                        ? (isRabbitSelected(rabbit) || selectedRabbits.length < selectedCage.cageCapacity ? 1 : 0.5)
                                        : 0.5
                                }}
                            >
                                <span className="align-cell">{rabbit.code}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{rabbit.race}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{rabbit.age}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{rabbit.sex}</span>
                                <span className="vertical-divider" />
                                <span className="align-cell">{rabbit.purpose}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="assign-rabbit-actions">
                <button
                    className="assign-btn"
                    onClick={handleAssign}
                    disabled={!selectedCage || selectedRabbits.length === 0 || loading}
                >
                    Asignar
                </button>
            </div>
            {showConfirm && (
                <div className="assign-rabbit-confirm-modal">
                    <div className="assign-rabbit-confirm-box">
                        <div className="assign-rabbit-confirm-title">
                            ¿Está seguro de asignar los siguientes conejos a la jaula seleccionada?
                        </div>
                        <div className="assign-rabbit-confirm-details">
                            <div>
                                <strong>Jaula:</strong> {selectedCage?.cageNumber} | {selectedCage?.cageType} | Capacidad: {selectedCage?.cageCapacity}
                            </div>
                            <div>
                                <strong>Conejos:</strong>
                                <ul>
                                    {selectedRabbits.map(r => (
                                        <li key={r.code}>
                                            {r.code} | {r.race} | {r.age} meses | {r.sex} | {r.purpose}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="assign-rabbit-confirm-btns">
                            <button
                                className="assign-btn"
                                onClick={confirmAssign}
                                disabled={loading}
                            >
                                Confirmar
                            </button>
                            <button
                                className="assign-cancel-btn"
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal para quitar asignación */}
            {showUnassignConfirm && (
                <div className="modal-success">
                    <div className="modal-success-content">
                        <div className="modal-success-icon">❓</div>
                        <div>
                            ¿Está seguro que desea <strong>eliminar completamente</strong> la asignación del conejo <b>{rabbitToUnassign}</b>?
                            <br />
                            <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
                                El registro se eliminará de la base de datos y el conejo volverá a aparecer en "Conejos Sin Asignar"
                            </small>
                        </div>
                        <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                className="confirm-btn"
                                onClick={handleUnassign}
                                disabled={loading}
                            >
                                Confirmar
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => setShowUnassignConfirm(false)}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Mensaje de éxito llamativo y temporal */}
            {message && (
                <div className="modal-success">
                    <div className="modal-success-content">
                        <div className="modal-success-icon">✅</div>
                        <div>{message}</div>
                    </div>
                </div>
            )}
            {error && <div className="assign-rabbit-error">{error}</div>}
            <div className="assignments-section">
                <h3>Asignaciones Actuales</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Jaula</th>
                            <th>Códigos Conejos</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(assignmentsByCage).length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                                    No hay asignaciones.
                                </td>
                            </tr>
                        )}
                        {Object.entries(assignmentsByCage).map(([cageNumber, rabbitsArr]) => (
                            <tr key={cageNumber}>
                                <td>{cageNumber}</td>
                                <td>
                                    <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {rabbitsArr.map(a => (
                                            <li
                                                key={a.rabbitCode}
                                                style={{
                                                    listStyle: 'none',
                                                    margin: 0,
                                                    padding: 0,
                                                    background: '#e0f7fa',
                                                    borderRadius: 6,
                                                    paddingInline: 10,
                                                    cursor: 'pointer',
                                                    color: '#1abc9c',
                                                    fontWeight: 500,
                                                    transition: 'background 0.2s, color 0.2s'
                                                }}
                                                title="Eliminar asignación de la base de datos"
                                                onClick={() => {
                                                    setRabbitToUnassign(a.rabbitCode);
                                                    setShowUnassignConfirm(true);
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.background = '#e74c3c22';
                                                    e.currentTarget.style.color = '#e74c3c';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.background = '#e0f7fa';
                                                    e.currentTarget.style.color = '#1abc9c';
                                                }}
                                            >
                                                {a.rabbitCode} <span style={{ fontSize: 14, marginLeft: 2 }}>✖</span>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                                <td>
                                    {rabbitsArr.every(a => a.status === rabbitsArr[0].status)
                                        ? rabbitsArr[0].status
                                        : 'Mixto'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssignRabbitCage;

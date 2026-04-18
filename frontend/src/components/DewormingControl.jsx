import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/DewormingControl.css';

const DewormingControl = () => {
    const [rabbits, setRabbits] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('');
    const [dewormingStatus, setDewormingStatus] = useState({});

    const fetchRabbitsData = useCallback(async () => {
        try {
            const [rabbitsRes, assignmentsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/rabbits'),
                axios.get('http://localhost:5000/api/assignments')
            ]);

            const assignments = assignmentsRes.data;
            const codeToCage = {};
            
            assignments.forEach(a => {
                if (a.status === 'asignado') {
                    codeToCage[a.rabbitCode] = a.cageNumber;
                }
            });

            const assignedRabbits = rabbitsRes.data
                .filter(rabbit => codeToCage[rabbit.code])
                .map(rabbit => ({
                    id: rabbit._id,
                    codigo: rabbit.code,
                    raza: rabbit.race,
                    sexo: rabbit.sex,
                    edad: rabbit.age,
                    jaula: codeToCage[rabbit.code],
                    desparasitacion: false,
                    seleccionado: false
                }));

            setRabbits(assignedRabbits);
            
            // Cargar estado de desparasitaciones
            if (assignedRabbits.length > 0) {
                await loadDewormingStatus(assignedRabbits.map(r => r.codigo));
            }
        } catch (err) {
            setError('Error al cargar los datos de los conejos');
            console.error('Error:', err);
        }
    }, []);

    useEffect(() => {
        fetchRabbitsData();
    }, [fetchRabbitsData]);

    const loadDewormingStatus = async (rabbitCodes) => {
        try {
            const response = await axios.post('http://localhost:5000/api/deworming-status', {
                rabbits: rabbitCodes
            });
            // Actualizar solo los conejos específicos, manteniendo el resto
            setDewormingStatus(prev => ({
                ...prev,
                ...response.data.status
            }));
        } catch (error) {
            console.error('Error al cargar estado de desparasitaciones:', error);
        }
    };

    const checkDewormingValidations = async (selectedRabbits) => {
        try {
            const response = await axios.post('http://localhost:5000/api/check-deworming-validations', {
                rabbits: selectedRabbits.map(r => r.codigo)
            });
            return response.data;
        } catch (error) {
            throw new Error('Error al verificar validaciones de desparasitación');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-ES');
    };

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const handleSelectRabbit = (id) => {
        setRabbits(prev => prev.map(rabbit => 
            rabbit.id === id 
                ? { 
                    ...rabbit, 
                    seleccionado: !rabbit.seleccionado,
                    desparasitacion: !rabbit.seleccionado // Si se selecciona, marca el checkbox
                }
                : rabbit
        ));
    };

    const handleSelectAll = () => {
        const filteredRabbits = getFilteredRabbits();
        const allSelected = filteredRabbits.every(rabbit => rabbit.seleccionado);
        
        setRabbits(prev => prev.map(rabbit => {
            if (filteredRabbits.some(fr => fr.id === rabbit.id)) {
                return { 
                    ...rabbit, 
                    seleccionado: !allSelected,
                    desparasitacion: !allSelected // También marca/desmarca el checkbox
                };
            }
            return rabbit;
        }));
    };

    const handleDewormingChange = (id, checked) => {
        setRabbits(prev => prev.map(rabbit => 
            rabbit.id === id 
                ? { ...rabbit, desparasitacion: checked, seleccionado: true }
                : rabbit
        ));
    };

    const handleRegisterDeworming = async () => {
        const selectedRabbits = rabbits.filter(rabbit => rabbit.seleccionado);
        
        if (selectedRabbits.length === 0) {
            setError('Debe seleccionar al menos un conejo para continuar.');
            return;
        }

        // Validar que la desparasitación esté seleccionada en cada conejo
        const rabbitsWithoutDeworming = selectedRabbits.filter(rabbit => !rabbit.desparasitacion);
        if (rabbitsWithoutDeworming.length > 0) {
            setError('Debe seleccionar la desparasitación para poder realizar el registro');
            return;
        }

        try {
            setError('');
            setMessage('');

            // Verificar validaciones de fechas
            const validationCheck = await checkDewormingValidations(selectedRabbits);
            
            // Registrar desparasitaciones
            await registerDewormings(selectedRabbits);
            
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar la desparasitación. Intente más tarde.';
            setError(errorMessage);
        }
    };

    const registerDewormings = async (dewormingsToRegister) => {
        const successfulRegistrations = [];
        const failedRegistrations = [];
        
        try {
            for (const rabbit of dewormingsToRegister) {
                try {
                    const dewormingData = {
                        codigo: rabbit.codigo,
                        desparasitacion: rabbit.desparasitacion
                    };

                    await axios.post('http://localhost:5000/api/register-deworming', dewormingData);
                    successfulRegistrations.push(rabbit.codigo);
                } catch (err) {
                    failedRegistrations.push({
                        codigo: rabbit.codigo,
                        error: err.response?.data?.message || 'Error desconocido'
                    });
                }
            }
            
            if (successfulRegistrations.length > 0) {
                setMessage(`Se registró el control de desparasitación para ${successfulRegistrations.length} conejo(s)`);
                
                // Actualizar estado después del registro
                await loadDewormingStatus(successfulRegistrations);
            }
            
            if (failedRegistrations.length > 0) {
                const errorDetails = failedRegistrations.map(f => `• ${f.error}`).join('\n\n');
                setError(`No se pudo registrar la desparasitación para los siguientes conejos:\n\n${errorDetails}`);
            }
            
            // Restablecer selecciones solo para los exitosos
            setRabbits(prev => prev.map(rabbit => {
                if (successfulRegistrations.includes(rabbit.codigo)) {
                    return {
                        ...rabbit,
                        desparasitacion: false,
                        seleccionado: false
                    };
                }
                return rabbit;
            }));
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error general al registrar desparasitaciones. Intente nuevamente.';
            setError(errorMessage);
        }
    };

    const getFilteredRabbits = () => {
        if (!filter) return rabbits;
        return rabbits.filter(rabbit =>
            rabbit.codigo.toLowerCase().includes(filter.toLowerCase()) ||
            rabbit.raza.toLowerCase().includes(filter.toLowerCase())
        );
    };

    const filteredRabbits = getFilteredRabbits();
    const selectedCount = filteredRabbits.filter(rabbit => rabbit.seleccionado).length;
    const allSelected = filteredRabbits.length > 0 && filteredRabbits.every(rabbit => rabbit.seleccionado);

    return (
        <div className="deworming-control-container">
            <div className="deworming-control-card">{/* removed loading */}
                
                <div className="deworming-info-msg">
                    ¡Control de Desparasitación! Selecciona los conejos que necesitan desparasitación mensual.
                </div>

                {message && <div className="deworming-success-msg">{message}</div>}

                <div className="deworming-filter-group">
                    <label>Filtrar por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={handleFilterChange}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>

                                <div className="deworming-percentage-bar-container">
                    <div className="deworming-percentage-bar-label">
                        Progreso de selección: {selectedCount} de {filteredRabbits.length} conejos ({Math.round((selectedCount / filteredRabbits.length) * 100) || 0}%)
                    </div>
                    <div className="deworming-percentage-bar">
                        <div className="deworming-percentage-bar-fill" style={{ width: `${Math.round((selectedCount / filteredRabbits.length) * 100) || 0}%` }}></div>
                    </div>
                </div>

                <div className="deworming-buttons-section">
                    <button 
                        onClick={handleSelectAll}
                        className={`deworming-select-all-btn${allSelected ? ' deselect' : ''}`}
                        disabled={filteredRabbits.length === 0}
                    >
                        <i className="fas fa-check"></i>
                        {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                    
                    <button 
                        onClick={handleRegisterDeworming}
                        className="deworming-submit-btn"
                        disabled={selectedCount === 0}
                    >
                        Registrar desparasitación
                    </button>
                </div>

                <div className="table-section">
                    {filteredRabbits.length === 0 ? (
                        <div className="no-result">
                            No hay conejos que coincidan con el filtro
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="rabbit-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Jaula</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>Código</th>
                                        <th style={{ width: '25%', textAlign: 'left' }}>Raza</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Edad (Meses)</th>
                                        <th style={{ width: '16%', textAlign: 'center' }}>Desparasitación</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Última Desparasitación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRabbits.map(rabbit => {
                                        const status = dewormingStatus[rabbit.codigo] || {};
                                        
                                        return (
                                            <tr 
                                                key={rabbit.id}
                                                className={rabbit.seleccionado ? 'selected' : ''}
                                                onClick={() => handleSelectRabbit(rabbit.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                    {rabbit.jaula}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                                    {rabbit.codigo}
                                                </td>
                                                <td style={{ textAlign: 'left', fontWeight: '500' }}>
                                                    {rabbit.raza}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {rabbit.edad} m
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rabbit.desparasitacion}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleDewormingChange(rabbit.id, e.target.checked);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="deworming-checkbox"
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#333' }}>
                                                    <div style={{ 
                                                        padding: '2px 6px', 
                                                        backgroundColor: '#f5f5f5', 
                                                        borderRadius: '3px',
                                                        border: '1px solid #e0e0e0'
                                                    }}>
                                                        {formatDate(status.lastDeworming)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal de error */}
                {error && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Error</h3>
                            <p>{error}</p>
                            <div className="modal-buttons">
                                <button className="modal-btn-cancel" onClick={() => setError('')}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de éxito */}
                {message && (
                    <div className="modal-success">
                        <div className="modal-success-content">
                            <span className="modal-success-icon">&#10003;</span>
                            <p>{message}</p>
                            <button className="modal-success-btn" onClick={() => setMessage('')}>Cerrar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DewormingControl;

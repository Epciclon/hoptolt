import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/VaccinationControl.css';

const VaccinationControl = () => {
    const [rabbits, setRabbits] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('');
    const [vaccinationStatus, setVaccinationStatus] = useState({});

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
                    mixomatosis: false,
                    vhd: false,
                    seleccionado: false
                }));

            setRabbits(assignedRabbits);
            
            // Cargar estado de vacunaciones
            if (assignedRabbits.length > 0) {
                await loadVaccinationStatus(assignedRabbits.map(r => r.codigo));
            }
        } catch (err) {
            setError('Error al cargar los datos de los conejos');
            console.error('Error:', err);
        }
    }, []);

    useEffect(() => {
        fetchRabbitsData();
    }, [fetchRabbitsData]);

    const loadVaccinationStatus = async (rabbitCodes) => {
        try {
            const response = await axios.post('http://localhost:5000/api/vaccination-status', {
                rabbits: rabbitCodes
            });
            // Actualizar solo los conejos específicos, manteniendo el resto
            setVaccinationStatus(prev => ({
                ...prev,
                ...response.data.status
            }));
        } catch (error) {
            console.error('Error al cargar estado de vacunaciones:', error);
        }
    };

    const checkVaccinationValidations = async (selectedRabbits) => {
        try {
            const response = await axios.post('http://localhost:5000/api/check-vaccination-validations', {
                rabbits: selectedRabbits.map(r => r.codigo)
            });
            return response.data;
        } catch (error) {
            throw new Error('Error al verificar validaciones de vacunación');
        }
    };

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const handleSelectRabbit = (id) => {
        setRabbits(prev => prev.map(rabbit => 
            rabbit.id === id 
                ? { ...rabbit, seleccionado: !rabbit.seleccionado }
                : rabbit
        ));
    };

    const handleSelectAll = () => {
        const filteredRabbits = getFilteredRabbits();
        const allSelected = filteredRabbits.every(rabbit => rabbit.seleccionado);
        
        setRabbits(prev => prev.map(rabbit => {
            if (filteredRabbits.some(fr => fr.id === rabbit.id)) {
                return { ...rabbit, seleccionado: !allSelected };
            }
            return rabbit;
        }));
    };

    const handleVaccineChange = (id, vaccineType, checked) => {
        setRabbits(prev => prev.map(rabbit => 
            rabbit.id === id 
                ? { ...rabbit, [vaccineType]: checked, seleccionado: true }
                : rabbit
        ));
    };

    const handleRegisterVaccination = async () => {
        const selectedRabbits = rabbits.filter(rabbit => rabbit.seleccionado);
        
        if (selectedRabbits.length === 0) {
            setError('Debe seleccionar al menos un conejo para continuar.');
            return;
        }

        // Validar que al menos una vacuna esté seleccionada en cada conejo
        const rabbitsWithoutVaccines = selectedRabbits.filter(rabbit => !rabbit.mixomatosis && !rabbit.vhd);
        if (rabbitsWithoutVaccines.length > 0) {
            setError('Debe seleccionar al menos una vacuna para poder realizar el registro');
            return;
        }

        try {
            setError('');
            setMessage('');

            // Verificar validaciones de fechas
            const validationCheck = await checkVaccinationValidations(selectedRabbits);
            
            // Registrar vacunaciones
            await registerVaccinations(selectedRabbits);
            
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar la vacunación. Intente más tarde.';
            setError(errorMessage);
        }
    };

    const registerVaccinations = async (vaccinationsToRegister) => {
        const successfulRegistrations = [];
        const failedRegistrations = [];
        
        try {
            for (const rabbit of vaccinationsToRegister) {
                try {
                    const vaccinationData = {
                        codigo: rabbit.codigo,
                        mixomatosis: rabbit.mixomatosis,
                        vhd: rabbit.vhd
                    };

                    await axios.post('http://localhost:5000/api/register-vaccination', vaccinationData);
                    successfulRegistrations.push(rabbit.codigo);
                } catch (err) {
                    failedRegistrations.push({
                        codigo: rabbit.codigo,
                        error: err.response?.data?.message || 'Error desconocido'
                    });
                }
            }
            
            if (successfulRegistrations.length > 0) {
                setMessage(`Se registró el control de vacunación para ${successfulRegistrations.length} conejo(s)`);
                
                // Actualizar estado después del registro
                await loadVaccinationStatus(successfulRegistrations);
            }
            
            if (failedRegistrations.length > 0) {
                const errorDetails = failedRegistrations.map(f => `• ${f.error}`).join('\n\n');
                setError(`No se pudo registrar la vacunación para los siguientes conejos:\n\n${errorDetails}`);
            }
            
            // Restablecer selecciones solo para los exitosos
            setRabbits(prev => prev.map(rabbit => {
                if (successfulRegistrations.includes(rabbit.codigo)) {
                    return {
                        ...rabbit,
                        mixomatosis: false,
                        vhd: false,
                        seleccionado: false
                    };
                }
                return rabbit;
            }));
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error general al registrar vacunaciones. Intente nuevamente.';
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('es-ES');
    };

    return (
        <div className="vaccination-control-container">
            <div className="vaccination-control-card">{/* removed loading */}
                
                <div className="info-msg">
                    Recuerde: Las vacunas se aplican una vez al año. Seleccione las vacunas aplicadas: 
                    Mixomatosis o Enfermedad Hemorrágica Vírica (VHD).
                </div>

                {message && <div className="success-msg">{message}</div>}

                <div className="filter-group">
                    <label>Filtrar por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={handleFilterChange}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>

                <div className="percentage-bar-container">
                    <div className="percentage-bar-label">
                        Seleccionados: {selectedCount} / {filteredRabbits.length}
                    </div>
                    <div className="percentage-bar">
                        <div className="percentage-bar-fill" style={{ width: `${Math.round((selectedCount / filteredRabbits.length) * 100) || 0}%` }}></div>
                    </div>
                </div>

                <div className="buttons-section">
                    <button 
                        onClick={handleSelectAll}
                        className={`select-all-btn${allSelected ? ' deselect' : ''}`}
                        disabled={filteredRabbits.length === 0}
                    >
                        <i className="fas fa-check"></i>
                        {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                    
                    <button 
                        onClick={handleRegisterVaccination}
                        className="submit-btn"
                        disabled={selectedCount === 0}
                    >
                        Registrar vacunación
                    </button>
                </div>

                <div className="table-section">
                    {filteredRabbits.length === 0 ? (
                        <div className="no-result">
                            No se encontraron conejos con los criterios especificados.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="rabbit-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '10%', textAlign: 'center' }}>Jaula</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Código</th>
                                        <th style={{ width: '18%', textAlign: 'left' }}>Raza</th>
                                        <th style={{ width: '8%', textAlign: 'center' }}>Edad (Meses)</th>
                                        <th style={{ width: '12%', textAlign: 'center' }} className="mixo-first">Mixomatosis</th>
                                        <th style={{ width: '15%', textAlign: 'center' }} className="mixo-last">Última Mixomatosis</th>
                                        <th style={{ width: '10%', textAlign: 'center' }} className="vhd-section">VHD</th>
                                        <th style={{ width: '15%', textAlign: 'center' }}>Última VHD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRabbits.map(rabbit => {
                                        const status = vaccinationStatus[rabbit.codigo] || {};
                                        
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
                                                <td className="mixo-first" style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rabbit.mixomatosis}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleVaccineChange(rabbit.id, 'mixomatosis', e.target.checked);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="vaccine-checkbox"
                                                    />
                                                </td>
                                                <td className="mixo-last" style={{ textAlign: 'center', fontSize: '0.9rem', color: '#333' }}>
                                                    <div style={{ 
                                                        padding: '2px 6px', 
                                                        backgroundColor: '#f5f5f5', 
                                                        borderRadius: '3px',
                                                        border: '1px solid #e0e0e0'
                                                    }}>
                                                        {formatDate(status.lastMixomatosis)}
                                                    </div>
                                                </td>
                                                <td className="vhd-section" style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={rabbit.vhd}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            handleVaccineChange(rabbit.id, 'vhd', e.target.checked);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="vaccine-checkbox"
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#333' }}>
                                                    <div style={{ 
                                                        padding: '2px 6px', 
                                                        backgroundColor: '#f5f5f5', 
                                                        borderRadius: '3px',
                                                        border: '1px solid #e0e0e0'
                                                    }}>
                                                        {formatDate(status.lastVhd)}
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
            </div>
        </div>
    );
};

export default VaccinationControl;

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/FeedingControl.css';

const FeedingControl = () => {
    const [rabbits, setRabbits] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('');
    const [dailyCounts, setDailyCounts] = useState({});
    const [showJustificationModal, setShowJustificationModal] = useState(false);
    const [justification, setJustification] = useState('');
    const [pendingFeedings, setPendingFeedings] = useState([]);
    const [justificationError, setJustificationError] = useState('');

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
                .map(rabbit => {
                    const peso = Number(rabbit.weight) || 0;
                    const dieta = peso * 20;
                    const henoSugerido = ((dieta * 0.7) / 2).toFixed(1);
                    const hierbaSugerida = ((dieta * 0.2) / 2).toFixed(1);
                    const balanceadoSugerido = ((dieta * 0.1) / 2).toFixed(1);
                    
                    return {
                        id: rabbit._id,
                        codigo: rabbit.code,
                        raza: rabbit.race,
                        sexo: rabbit.sex,
                        edad: rabbit.age,
                        peso: rabbit.weight,
                        jaula: codeToCage[rabbit.code],
                        heno: henoSugerido,
                        hierba: hierbaSugerida,
                        balanceado: balanceadoSugerido,
                        seleccionado: false
                    };
                });

            setRabbits(assignedRabbits);
            
            // Cargar conteos diarios
            if (assignedRabbits.length > 0) {
                await loadDailyCounts(assignedRabbits.map(r => r.codigo));
            }
        } catch (err) {
            setError('Error al cargar los datos de los conejos');
            console.error('Error:', err);
        }
    }, []); // useCallback sin dependencias ya que no usa ningún estado o prop

    useEffect(() => {
        fetchRabbitsData();
    }, [fetchRabbitsData]);

    const loadDailyCounts = async (rabbitCodes) => {
        try {
            const response = await axios.post('http://localhost:5000/api/daily-counts', {
                rabbits: rabbitCodes
            });
            setDailyCounts(response.data.counts);
        } catch (error) {
            console.error('Error al cargar conteos diarios:', error);
            setDailyCounts({});
        }
    };

    const checkDailyFeedings = async (selectedRabbits) => {
        try {
            const response = await axios.post('http://localhost:5000/api/check-daily-feedings', {
                rabbits: selectedRabbits.map(r => r.codigo)
            });
            return response.data;
        } catch (error) {
            throw new Error('Error al verificar registros diarios');
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

    const handleInputChange = (id, field, value) => {
        setRabbits(prev => prev.map(rabbit => 
            rabbit.id === id 
                ? { ...rabbit, [field]: value.replace(/[^0-9.]/g, '') }
                : rabbit
        ));
    };

    const handleRegisterFeeding = async () => {
        const selectedRabbits = rabbits.filter(rabbit => rabbit.seleccionado);
        
        if (selectedRabbits.length === 0) {
            setError('Debe seleccionar al menos un conejo');
            return;
        }

        try {
            setError('');
            setMessage('');

            // Verificar registros diarios
            const dailyCheck = await checkDailyFeedings(selectedRabbits);
            
            if (dailyCheck.requiresJustification) {
                setPendingFeedings(selectedRabbits);
                setShowJustificationModal(true);
                return;
            }

            // Registrar normalmente
            await registerFeedings(selectedRabbits);
            
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar la alimentación. Intente más tarde.';
            setError(errorMessage);
        }
    };

    const registerFeedings = async (feedingsToRegister, justificationText = null) => {
        try {
            for (const rabbit of feedingsToRegister) {
                const feedingData = {
                    codigo: rabbit.codigo,
                    heno: Number(rabbit.heno) || 0,
                    hierba: Number(rabbit.hierba) || 0,
                    balanceado: Number(rabbit.balanceado) || 0
                };

                if (justificationText) {
                    feedingData.justificacion = justificationText;
                }

                await axios.post('http://localhost:5000/api/register-feeding', feedingData);
            }
            
            setMessage(`Alimentación registrada exitosamente para ${feedingsToRegister.length} conejo(s)`);
            
            // Actualizar conteos diarios después del registro
            await loadDailyCounts(feedingsToRegister.map(r => r.codigo));
            
            // Restablecer selecciones y valores
            setRabbits(prev => prev.map(rabbit => {
                if (rabbit.seleccionado) {
                    const peso = Number(rabbit.peso) || 0;
                    const dieta = peso * 20;
                    return {
                        ...rabbit,
                        heno: ((dieta * 0.7) / 2).toFixed(1),
                        hierba: ((dieta * 0.2) / 2).toFixed(1),
                        balanceado: ((dieta * 0.1) / 2).toFixed(1),
                        seleccionado: false
                    };
                }
                return rabbit;
            }));
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar la alimentación. Intente más tarde.';
            setError(errorMessage);
        }
    };

    const handleJustificationSubmit = async () => {
        setJustificationError('');
        
        if (!justification.trim()) {
            setJustificationError('La justificación es obligatoria para registros adicionales.');
            return;
        }

        setShowJustificationModal(false);
        await registerFeedings(pendingFeedings, justification);
        setJustification('');
        setPendingFeedings([]);
        setJustificationError('');
    };

    const handleJustificationCancel = () => {
        setShowJustificationModal(false);
        setJustification('');
        setPendingFeedings([]);
        setJustificationError('');
        setError('Registro cancelado. No se pueden realizar más de 2 registros diarios sin justificación.');
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
        <div className="feeding-control-container">
            <div className="feeding-control-card">{/* removed loading */}
                
                <div className="info-msg">
                    Recuerde: Solo se puede registrar la alimentación dos veces al día por conejo. 
                    Puede editar las cantidades según las necesidades específicas de cada conejo.
                </div>

                {error && <div className="error-msg">{error}</div>}
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
                        onClick={handleRegisterFeeding}
                        className="submit-btn"
                        disabled={selectedCount === 0}
                    >
                        Registrar alimentación
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
                                        <th style={{ width: '8%', textAlign: 'center' }}>Jaula</th>
                                        <th style={{ width: '10%', textAlign: 'center' }}>Código</th>
                                        <th style={{ width: '15%', textAlign: 'left' }}>Raza</th>
                                        <th style={{ width: '8%', textAlign: 'center' }}>Edad (Meses)</th>
                                        <th style={{ width: '9%', textAlign: 'center' }}>Peso</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Heno Seco</th>
                                        <th style={{ width: '14%', textAlign: 'center' }}>Hierba Húmeda</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Balanceado</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Veces alimentado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRabbits.map(rabbit => (
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
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                {rabbit.peso} kg
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={rabbit.heno}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleInputChange(rabbit.id, 'heno', e.target.value);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="input-table input-feeding"
                                                    placeholder={`${rabbit.heno}g`}
                                                    style={{ width: '90%', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={rabbit.hierba}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleInputChange(rabbit.id, 'hierba', e.target.value);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="input-table input-feeding"
                                                    placeholder={`${rabbit.hierba}g`}
                                                    style={{ width: '90%', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={rabbit.balanceado}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleInputChange(rabbit.id, 'balanceado', e.target.value);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="input-table input-feeding"
                                                    placeholder={`${rabbit.balanceado}g`}
                                                    style={{ width: '90%', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    color: (dailyCounts[rabbit.codigo] || 0) >= 3 ? '#ff8c00' : '#000000', 
                                                    fontWeight: 'bold', 
                                                    fontSize: '1.1rem',
                                                    padding: '4px 8px',
                                                    backgroundColor: (dailyCounts[rabbit.codigo] || 0) >= 3 ? '#fff3cd' : 'transparent',
                                                    borderRadius: '3px',
                                                    border: (dailyCounts[rabbit.codigo] || 0) >= 3 ? '1px solid #ffeaa7' : 'none'
                                                }}>
                                                    {dailyCounts[rabbit.codigo] || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal de justificación */}
                {showJustificationModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Justificación requerida</h3>
                            <p>Ya ha registrado la alimentación dos veces hoy. Para registrar una vez más, debe proporcionar una justificación:</p>
                            
                            {justificationError && <p className="error-msg" style={{ marginBottom: '15px' }}>{justificationError}</p>}
                            
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="Ingrese la justificación para este registro adicional..."
                                rows={4}
                                className="justification-textarea"
                            />
                            <div className="modal-buttons">
                                <button className="modal-btn-success" onClick={handleJustificationSubmit}>
                                    Continuar
                                </button>
                                <button className="modal-btn-cancel" onClick={handleJustificationCancel}>
                                    Cancelar
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

export default FeedingControl;

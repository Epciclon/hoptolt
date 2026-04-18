import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/GrowthControl.css';

const GrowthControl = () => {
    const [rabbits, setRabbits] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('');
    const [weightIncrement, setWeightIncrement] = useState('');
    const [isDecrement, setIsDecrement] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [ageUpdateMessage, setAgeUpdateMessage] = useState('');

    // Cargar datos iniciales y actualizar edades automáticamente
    const fetchRabbitsData = useCallback(async () => {
        try {
            setError('');
            
            // Llamada al backend que actualiza automáticamente las edades
            const response = await axios.get('http://localhost:5000/api/growth/update-age-and-list');
            
            if (response.data.success) {
                const rabbitsData = response.data.data.rabbits;
                
                // Mapear datos para la tabla
                const formattedRabbits = rabbitsData.map(rabbit => ({
                    id: rabbit._id,
                    codigo: rabbit.code,
                    sexo: rabbit.sex,
                    edad: rabbit.age,
                    peso: rabbit.weight || 0,
                    raza: rabbit.race?.name || 'Sin raza',
                    jaula: rabbit.cage?.cageNumber || 'Sin asignar',
                    seleccionado: false,
                    // Usar los datos reales del backend
                    vacunas: rabbit.lastVaccination || 'Sin registros',
                    desparasitacion: rabbit.lastDeworming || 'Sin registros'
                }));

                setRabbits(formattedRabbits);
                setAgeUpdateMessage(response.data.message);
                
                // Mostrar mensaje por 5 segundos
                setTimeout(() => setAgeUpdateMessage(''), 5000);
            }
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setError('Error al cargar los datos de los conejos o actualizar edades');
        }
    }, []);

    useEffect(() => {
        fetchRabbitsData();
    }, [fetchRabbitsData]);

    // Manejar cambio en el filtro
    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    // Función para filtrar conejos
    const getFilteredRabbits = () => {
        if (!filter) return rabbits;
        return rabbits.filter(rabbit =>
            rabbit.codigo.toLowerCase().includes(filter.toLowerCase()) ||
            rabbit.raza.toLowerCase().includes(filter.toLowerCase())
        );
    };

    // Filtrar conejos
    const filteredRabbits = getFilteredRabbits();

    // Calcular porcentaje de selección basado en conejos filtrados
    const selectedCount = filteredRabbits.filter(r => r.seleccionado).length;
    const totalCount = filteredRabbits.length;
    const percentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

    // Manejar selección individual
    const handleRabbitSelect = (codigo) => {
        setRabbits(prev => prev.map(rabbit =>
            rabbit.codigo === codigo
                ? { ...rabbit, seleccionado: !rabbit.seleccionado }
                : rabbit
        ));
    };

    // Seleccionar/deseleccionar todos (solo los filtrados)
    const toggleSelectAll = () => {
        const filteredRabbits = getFilteredRabbits();
        const allSelected = filteredRabbits.every(rabbit => rabbit.seleccionado);
        
        setRabbits(prev => prev.map(rabbit => {
            if (filteredRabbits.some(fr => fr.id === rabbit.id)) {
                return { ...rabbit, seleccionado: !allSelected };
            }
            return rabbit;
        }));
    };

    // Actualizar peso
    const handleWeightUpdate = async () => {
        // Validaciones mejoradas con mensajes específicos
        if (!weightIncrement || isNaN(weightIncrement)) {
            setError('⚠️ Validación de entrada: El valor de peso debe ser un número válido.');
            return;
        }

        const weightValue = parseFloat(weightIncrement);
        if (weightValue <= 0) {
            setError('⚠️ Validación de entrada: El cambio de peso debe ser un número positivo mayor a cero.');
            return;
        }

        if (weightValue > 4.5) {
            setError('⚠️ Límite de peso: El cambio de peso no puede ser mayor a 4.5 kg por seguridad del animal.');
            return;
        }

        const selectedRabbits = rabbits.filter(r => r.seleccionado);
        if (selectedRabbits.length === 0) {
            setError('⚠️ Selección requerida: Debe seleccionar al menos un conejo para actualizar el peso.');
            return;
        }

        try {
            setError('');
            const rabbitIds = selectedRabbits.map(r => r.id);
            const weightChange = isDecrement ? -weightValue : weightValue;
            
            const response = await axios.post('http://localhost:5000/api/growth/update-weight', {
                rabbitIds,
                weightChange: weightChange
            });

            if (response.data.success) {
                let successMessage = response.data.message;
                
                // Separar claramente advertencias y errores
                if (response.data.warnings && response.data.warnings.length > 0) {
                    const warningMessages = response.data.warnings.map(w => `• ${w.code}: ${w.message}`).join('\n');
                    successMessage += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🟡 ADVERTENCIAS DE PESO:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' + warningMessages;
                }

                if (response.data.errors && response.data.errors.length > 0) {
                    const errorMessages = response.data.errors.map(e => `• ${e.code}: ${e.message}`).join('\n');
                    successMessage += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔴 ERRORES CRÍTICOS:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' + errorMessages;
                }

                setModalMessage(successMessage);
                setShowSuccessModal(true);
                
                // Recargar datos
                await fetchRabbitsData();
                
                // Limpiar formulario
                setWeightIncrement('');
                setIsDecrement(false);
                setRabbits(prev => prev.map(r => ({ ...r, seleccionado: false })));
                
            } else {
                setError(`❌ Error del servidor: ${response.data.message}`);
            }
        } catch (err) {
            console.error('Error al actualizar peso:', err);
            if (err.response?.data?.message) {
                setError(`❌ Error del servidor: ${err.response.data.message}`);
            } else {
                setError('❌ Error de conexión: No se pudo conectar con el servidor. Verifique su conexión.');
            }
        }
    };

    // Cerrar modales
    const closeModal = () => {
        setShowModal(false);
        setShowSuccessModal(false);
        setModalMessage('');
    };

    // Calcular si todos los filtrados están seleccionados
    const allFilteredSelected = filteredRabbits.length > 0 && filteredRabbits.every(rabbit => rabbit.seleccionado);

    return (
        <div className="growth-control-container">
            <div className="growth-control-card">

                {/* Mensaje de actualización de edad */}
                {ageUpdateMessage && (
                    <div className="growth-info-msg">
                        {ageUpdateMessage}
                    </div>
                )}

                {/* Mensajes de error y éxito */}
                {error && <div className="growth-error-msg">{error}</div>}
                {message && <div className="growth-success-msg">{message}</div>}

                {/* Filtro */}
                <div className="growth-filter-group">
                    <label>Filtrar por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={handleFilterChange}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>

                {/* Barra de porcentaje */}
                <div className="growth-percentage-bar-container">
                    <div className="growth-percentage-bar-label">
                        Conejos seleccionados: {selectedCount} de {totalCount} ({percentage}%)
                    </div>
                    <div className="growth-percentage-bar">
                        <div 
                            className="growth-percentage-bar-fill" 
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Campo de cambio de peso */}
                <div className="growth-weight-input-group">
                    <label htmlFor="weightIncrement">
                        {isDecrement ? 'Reducir peso (kg):' : 'Incrementar peso (kg):'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="number"
                            id="weightIncrement"
                            value={weightIncrement}
                            onChange={(e) => setWeightIncrement(e.target.value)}
                            placeholder="Ej: 0.5"
                            step="0.1"
                            min="0.1"
                            max="4.5"
                        />
                        <button
                            type="button"
                            onClick={() => setIsDecrement(!isDecrement)}
                            style={{
                                padding: '8px 12px',
                                border: '2px solid #9c27b0',
                                borderRadius: '6px',
                                background: isDecrement ? '#9c27b0' : 'white',
                                color: isDecrement ? 'white' : '#9c27b0',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            {isDecrement ? '➖ Reducir' : '➕ Aumentar'}
                        </button>
                    </div>
                </div>

                {/* Botones */}
                <div className="growth-buttons-section">
                    <button
                        className={`growth-select-all-btn ${allFilteredSelected ? 'deselect' : ''}`}
                        onClick={toggleSelectAll}
                        disabled={filteredRabbits.length === 0}
                    >
                        {allFilteredSelected ? '✕ Deseleccionar Todos' : '✓ Seleccionar Todos'}
                    </button>

                    <button
                        className="growth-submit-btn"
                        onClick={handleWeightUpdate}
                        disabled={selectedCount === 0 || !weightIncrement}
                    >
                        {isDecrement ? `📉 Reducir Peso (${selectedCount} conejos)` : `📊 Aumentar Peso (${selectedCount} conejos)`}
                    </button>
                </div>

                {/* Tabla de conejos mejorada */}
                <div className="table-section">
                    <div className="table-responsive">
                        {filteredRabbits.length === 0 ? (
                            <div className="no-result">No se encontraron conejos</div>
                        ) : (
                            <table className="rabbit-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '8%', textAlign: 'center' }}>Jaula</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Código</th>
                                        <th style={{ width: '10%', textAlign: 'center' }}>Edad (Meses)</th>
                                        <th style={{ width: '15%', textAlign: 'left' }}>Raza</th>
                                        <th style={{ width: '12%', textAlign: 'center' }}>Peso</th>
                                        <th style={{ width: '20%', textAlign: 'center' }}>Última Vacuna</th>
                                        <th style={{ width: '23%', textAlign: 'center' }}>Última Desparasitación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRabbits.map((rabbit) => (
                                        <tr 
                                            key={rabbit.codigo}
                                            className={rabbit.seleccionado ? 'selected' : ''}
                                            onClick={() => handleRabbitSelect(rabbit.codigo)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                                {rabbit.jaula}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#9c27b0' }}>
                                                {rabbit.codigo}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {rabbit.edad} m
                                            </td>
                                            <td style={{ textAlign: 'left', fontWeight: '500' }}>
                                                {rabbit.raza}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span 
                                                    style={{
                                                        color: rabbit.peso < 2 ? '#d32f2f' : rabbit.peso > 4.5 ? (rabbit.peso > 5 ? '#d32f2f' : '#ff8c00') : '#2e7d32',
                                                        fontSize: (rabbit.peso < 2 || rabbit.peso > 4.5) ? '1.1rem' : '1rem',
                                                        fontWeight: 'bold',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        backgroundColor: rabbit.peso < 2 ? '#ffebee' : rabbit.peso > 4.5 ? (rabbit.peso > 5 ? '#ffebee' : '#fff3e0') : '#e8f5e8',
                                                        border: `1px solid ${rabbit.peso < 2 ? '#ffcdd2' : rabbit.peso > 4.5 ? (rabbit.peso > 5 ? '#ffcdd2' : '#ffcc02') : '#c8e6c9'}`,
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    {rabbit.peso} kg
                                                    {rabbit.peso < 2 && ' 🚨'}
                                                    {rabbit.peso > 4.5 && rabbit.peso <= 5 && ' ⚠️'}
                                                    {rabbit.peso > 5 && ' 🚫'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#333' }}>
                                                <div style={{ 
                                                    padding: '2px 6px', 
                                                    backgroundColor: '#f5f5f5', 
                                                    borderRadius: '3px',
                                                    border: '1px solid #e0e0e0'
                                                }}>
                                                    {rabbit.vacunas}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '0.9rem', color: '#333' }}>
                                                <div style={{ 
                                                    padding: '2px 6px', 
                                                    backgroundColor: '#f5f5f5', 
                                                    borderRadius: '3px',
                                                    border: '1px solid #e0e0e0'
                                                }}>
                                                    {rabbit.desparasitacion}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de éxito */}
            {showSuccessModal && (
                <div className="modal-success">
                    <div className="modal-success-content">
                        <span className="modal-success-icon">✅</span>
                        <p>{modalMessage}</p>
                        <button className="modal-success-btn" onClick={closeModal}>
                            Aceptar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de error */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Error</h3>
                        <p>{modalMessage}</p>
                        <div className="modal-buttons">
                            <button className="modal-btn-cancel" onClick={closeModal}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GrowthControl;

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/MatingRegister.css';

const MatingRegister = () => {
    const [allFemales, setAllFemales] = useState([]); // Para mantener lista original
    const [rabbitsData, setRabbitsData] = useState({}); // Para almacenar datos completos de conejos
    const [selected, setSelected] = useState(null);
    const [matingDate, setMatingDate] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState(''); // Para el filtro

    useEffect(() => {
        fetchFemales();
        fetchRabbitsData();
    }, []);

    const fetchFemales = async () => {
        try {
            const res = await axios.get('/api/mating/females');
            console.log('Females data:', res.data); // Debug: ver estructura de datos
            setAllFemales(res.data); // Guardar lista original
        } catch {
            setAllFemales([]);
        }
    };

    const fetchRabbitsData = async () => {
        try {
            const res = await axios.get('/api/rabbits');
            console.log('All rabbits data:', res.data); // Debug: ver datos de conejos
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

    // Filtrar conejas por código o raza
    const filteredFemales = Array.isArray(allFemales)
        ? allFemales.filter(female => {
            if (!female || !female.code) return false;
            
            const searchTerm = filter.toLowerCase().trim();
            const code = female.code.toLowerCase();
            
            // Obtener datos del conejo desde rabbitsData
            const rabbitData = rabbitsData[female.code];
            const race = (rabbitData?.race || rabbitData?.breed || '').toLowerCase();
            
            return code.includes(searchTerm) || race.includes(searchTerm);
        })
        : [];

    const handleMatingDateChange = (e) => {
        const value = e.target.value;
        setMatingDate(value);
        if (value) {
            const date = new Date(value);
            date.setDate(date.getDate() + 30);
            setBirthDate(date.toISOString().slice(0, 10));
        } else {
            setBirthDate('');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (!selected) {
            setError('Seleccione una coneja.');
            return;
        }
        if (!matingDate) {
            setError('Debe ingresar la fecha de monta.');
            return;
        }
        setLoading(true);
        try {
            await axios.post('/api/mating/register', {
                rabbitCode: selected.code,
                cageNumber: selected.cageNumber,
                matingDate
            });
            setMessage('Se registró la fecha de monta.');
            setSelected(null);
            setMatingDate('');
            setBirthDate('');
            fetchFemales();
            fetchRabbitsData(); // Actualizar datos de conejos también
            setTimeout(() => setMessage(''), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar la monta.');
        }
        setLoading(false);
    };

    return (
        <div className="mating-register-container">
            {/* Modal/Overlay del formulario - aparece cuando hay una coneja seleccionada */}
            {selected && (
                <div className="edit-form-overlay">
                    <div className="edit-form-card">
                        <h3>Registrar Monta - {selected.code}</h3>
                        <div className="mating-register-selected-info">
                            <div className="selected-rabbit-details">
                                <p><strong>Jaula:</strong> {selected.cageNumber}</p>
                                <p><strong>Código:</strong> {selected.code}</p>
                                <p><strong>Raza:</strong> {rabbitsData[selected.code]?.race || rabbitsData[selected.code]?.breed || 'N/A'}</p>
                                <p><strong>Edad:</strong> {selected.age} meses</p>
                                <p><strong>Sexo:</strong> {selected.sex}</p>
                            </div>
                        </div>
                        <form onSubmit={handleRegister} className="edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fecha de monta:</label>
                                    <input
                                        type="date"
                                        value={matingDate}
                                        onChange={handleMatingDateChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha estimada de parto:</label>
                                    <input
                                        type="date"
                                        value={birthDate}
                                        readOnly
                                        style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                    />
                                </div>
                            </div>
                            <div className="form-buttons">
                                <button type="submit" className="save-btn" disabled={loading}>Registrar Monta</button>
                                <button type="button" onClick={() => setSelected(null)} className="cancel-btn" disabled={loading}>Cancelar</button>
                            </div>
                        </form>
                        {message && <p className="success-msg">{message}</p>}
                        {error && <p className="error-msg">{error}</p>}
                    </div>
                </div>
            )}

            <div className="mating-register-card">
                <h2>Registrar Monta</h2>
                {error && <p className="mating-register-error-msg">{error}</p>}
                {message && (
                    <div className="modal-success">
                        <div className="modal-success-content">
                            <span className="modal-success-icon">&#10003;</span>
                            <p>{message}</p>
                            <button className="modal-success-btn" onClick={() => setMessage('')}>Cerrar</button>
                        </div>
                    </div>
                )}
                <div className="mating-register-filter-group">
                    <label>Buscar coneja por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>
                {!selected && (
                    <div className="mating-register-table-responsive">
                        <table className="mating-register-table">
                            <thead>
                                <tr>
                                    <th>Jaula</th>
                                    <th>Código</th>
                                    <th>Raza</th>
                                    <th>Edad</th>
                                    <th>Sexo</th>
                                    <th>Seleccionar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFemales.map(f => {
                                    const rabbitData = rabbitsData[f.code];
                                    return (
                                        <tr key={f.code}>
                                            <td>{f.cageNumber}</td>
                                            <td>{f.code}</td>
                                            <td>{rabbitData?.race || rabbitData?.breed || 'N/A'}</td>
                                            <td>{f.age}</td>
                                            <td>{f.sex}</td>
                                            <td>
                                                <button
                                                    className="mating-register-btn"
                                                    onClick={() => {
                                                        setSelected(f);
                                                        setMatingDate('');
                                                        setBirthDate('');
                                                        setError('');
                                                        setMessage('');
                                                    }}
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredFemales.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>
                                            {filter ? 'No se encontraron conejas que coincidan con la búsqueda.' : 'No hay conejas disponibles.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatingRegister;

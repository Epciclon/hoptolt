import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/CageEdit.css';

const CageEdit = () => {
    const [cages, setCages] = useState([]);
    console.log(cages);
    const [filter, setFilter] = useState('');
    const [selectedCage, setSelectedCage] = useState(null);
    const [editData, setEditData] = useState({ type: '', capacity: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('/api/cages')
            .then(res => {
                // Mapea los campos al formato esperado por el frontend
                const mapped = res.data.map(c => ({
                    number: c.number ?? c.cageNumber,
                    type: (c.type ?? c.cageType)?.toLowerCase(),
                    capacity: c.capacity ?? c.cageCapacity
                }));
                setCages(mapped);
            })
            .catch(() => setCages([]));
    }, []);

    // Mostrar todas si el filtro está vacío
    const filteredCages = Array.isArray(cages)
        ? cages.filter(c =>
            c &&
            c.number !== undefined &&
            c.number !== null &&
            c.type &&
            c.capacity &&
            c.number.toString().includes(filter.trim())
        )
        : [];

    const handleSelect = (cage) => {
        setSelectedCage(cage);
        setEditData({ type: cage.type, capacity: cage.capacity });
        setMessage('');
        setError('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditData({ ...editData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        if (!editData.type || !editData.capacity) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (editData.type === 'reproducción' && Number(editData.capacity) !== 1) {
            setError('La capacidad máxima para jaula de reproducción es 1.');
            return;
        }
        if (editData.type === 'engorde' && (Number(editData.capacity) < 1 || Number(editData.capacity) > 6)) {
            setError('La capacidad para jaula de engorde debe ser entre 1 y 6.');
            return;
        }
        try {
            await axios.put(`/api/cages/${selectedCage.number}`, editData);
            setMessage('Jaula editada con éxito.');
            setCages(cages.map(c => c.number === selectedCage.number ? { ...c, ...editData } : c));
            setSelectedCage(null);
        } catch (err) {
            setError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Error al editar la jaula.');
        }
    };

    return (
        <div className="cage-edit-container">
            <div className="cage-edit-card">
                <h2>Editar Jaula</h2>
                {error && <p className="error-msg">{error}</p>}
                {message && <p className="success-msg">{message}</p>}
                <div className="filter-group">
                    <label>Filtrar por número:</label>
                    <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Ej: 1" />
                </div>
                <div className="table-responsive">
                    <table className="cage-table">
                        <thead>
                            <tr>
                                <th>Número</th>
                                <th>Tipo</th>
                                <th>Capacidad</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCages.map(cage => (
                                <tr key={cage.number}>
                                    <td>{cage.number}</td>
                                    <td>{cage.type}</td>
                                    <td>{cage.capacity}</td>
                                    <td>
                                        <button className="edit-btn" onClick={() => handleSelect(cage)}>Editar</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredCages.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No hay jaulas para mostrar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {selectedCage && (
                    <div className="modal-edit-cage">
                        <div className="modal-edit-cage-content">
                            <form onSubmit={handleSubmit} className="edit-form">
                                <h3>Editar datos de jaula {selectedCage.number}</h3>
                                <div className="form-group">
                                    <label>Número de jaula:</label>
                                    <input type="text" value={selectedCage.number} readOnly />
                                </div>
                                <div className="form-group">
                                    <label>Tipo de jaula:</label>
                                    <select name="type" value={editData.type} onChange={handleChange} required>
                                        <option value="">Seleccione tipo</option>
                                        <option value="engorde">Engorde</option>
                                        <option value="reproducción">Reproducción</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Capacidad:</label>
                                    <input type="number" name="capacity" value={editData.capacity} onChange={handleChange} min={1} max={editData.type === 'engorde' ? 6 : 1} required />
                                </div>
                                <div className="edit-form-btns">
                                    <button type="submit" className="submit-btn">Guardar Cambios</button>
                                    <button type="button" className="cancel-btn" onClick={() => setSelectedCage(null)}>Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CageEdit;
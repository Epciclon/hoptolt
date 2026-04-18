import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/CageDelete.css';

const CageDelete = () => {
    const [cages, setCages] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedCage, setSelectedCage] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('/api/cages').then(res => setCages(res.data));
    }, []);

    const filteredCages = cages.filter(c => c.number.toString().includes(filter));

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/cages/${selectedCage.number}`);
            setMessage('Jaula eliminada correctamente.');
            setCages(cages.filter(c => c.number !== selectedCage.number));
            setSelectedCage(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al eliminar la jaula.');
        }
    };

    return (
        <div className="cage-delete-container">
            <div className="cage-delete-card">
                <h2>Eliminar Jaula</h2>
                {error && <p className="error-msg">{error}</p>}
                {message && <p className="success-msg">{message}</p>}
                <div className="filter-group">
                    <label>Filtrar por número:</label>
                    <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Ej: 1" />
                </div>
                {!selectedCage && (
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
                                            <button className="delete-btn" onClick={() => setSelectedCage(cage)}>Eliminar</button>
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
                )}
                {selectedCage && (
                    <div className="delete-confirm">
                        <h3>¿Seguro que deseas eliminar esta jaula?</h3>
                        <div className="delete-confirm-details">
                            <p><strong>Número:</strong> {selectedCage.number}</p>
                            <p><strong>Tipo:</strong> {selectedCage.type}</p>
                            <p><strong>Capacidad:</strong> {selectedCage.capacity}</p>
                        </div>
                        <div className="delete-confirm-btns">
                            <button className="confirm-btn" onClick={handleDelete}>Confirmar Eliminar</button>
                            <button className="cancel-btn" onClick={() => setSelectedCage(null)}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CageDelete;
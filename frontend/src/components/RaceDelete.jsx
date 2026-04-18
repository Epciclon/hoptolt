// src/components/RaceDelete.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/RaceDelete.css';

const RaceDelete = () => {
    const [races, setRaces] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedRace, setSelectedRace] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchRaces();
    }, []);

    const fetchRaces = async () => {
        try {
            const res = await axios.get('/api/races');
            setRaces(res.data);
        } catch {
            setError('Error al obtener las razas.');
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/races/${selectedRace.name}`);
            setMessage('Raza eliminada correctamente.');
            setRaces(races.filter(r => r.name !== selectedRace.name));
            setSelectedRace(null);
        } catch (err) {
            setError('Error al eliminar la raza.');
        }
    };

    const filteredRaces = races.filter(r =>
        r.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="cage-delete-container">
            <div className="cage-delete-card">
                <h2>Eliminar Raza</h2>
                {error && <p className="error-msg">{error}</p>}
                {message && <p className="success-msg">{message}</p>}
                <div className="filter-group">
                    <label>Buscar por nombre:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Ej: rex"
                    />
                </div>
                {!selectedRace && (
                    <div className="table-responsive">
                        <table className="cage-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRaces.map(race => (
                                    <tr key={race.name}>
                                        <td>{race.name}</td>
                                        <td>{race.description}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => setSelectedRace(race)}>
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRaces.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>
                                            No hay razas para mostrar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {selectedRace && (
                    <div className="delete-confirm">
                        <h3>¿Seguro que deseas eliminar esta raza?</h3>
                        <div className="delete-confirm-details">
                            <p><strong>Nombre:</strong> {selectedRace.name}</p>
                            <p><strong>Descripción:</strong> {selectedRace.description}</p>
                        </div>
                        <div className="delete-confirm-btns">
                            <button className="confirm-btn" onClick={handleDelete}>Confirmar Eliminar</button>
                            <button className="cancel-btn" onClick={() => setSelectedRace(null)}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RaceDelete;

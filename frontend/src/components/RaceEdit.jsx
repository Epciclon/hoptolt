import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/RaceEdit.css';
import '../styles/RaceForm.css';

const RaceEdit = () => {
    const [races, setRaces] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedRace, setSelectedRace] = useState(null);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchRaces = async () => {
            try {
                const res = await axios.get('/api/races');
                if (isMounted) {
                    setRaces(res.data);
                }
            } catch {
                if (isMounted) {
                    setError('Error al obtener las razas.');
                }
            }
        };
        fetchRaces();
        return () => { isMounted = false; };
    }, []);

    const handleSelect = (race) => {
        setSelectedRace(race);
        setDescription(race.description);
        setError('');
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!description || description.length < 5) {
            setError('La descripción debe tener al menos 5 caracteres.');
            return;
        }
        try {
            await axios.put(`/api/races/${selectedRace.name}`, { description });
            setMessage('Raza editada exitosamente.');
            setRaces(races.map(r =>
                r.name === selectedRace.name ? { ...r, description } : r
            ));
            setSelectedRace(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al editar la raza.');
        }
    };

    const handleCancel = () => {
        setSelectedRace(null);
        setError('');
        setMessage('');
    };

    const filteredRaces = races.filter(r =>
        r.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="rabbit-edit-container">
            <div className="rabbit-edit-card">
                <h2>Editar Raza</h2>
                {/* Mensajes en modal */}
                {error && (
                    <div className="race-modal-success">
                        <div className="race-modal-success-content">
                            <span className="race-modal-success-icon">&#9888;</span>
                            <p className="error-msg">{error}</p>
                            <button className="race-modal-success-btn" onClick={() => setError('')}>Cerrar</button>
                        </div>
                    </div>
                )}
                {message && (
                    <div className="race-modal-success">
                        <div className="race-modal-success-content">
                            <span className="race-modal-success-icon">&#10003;</span>
                            <p className="success-msg">{message}</p>
                            <button className="race-modal-success-btn" onClick={() => setMessage('')}>Cerrar</button>
                        </div>
                    </div>
                )}

                <div className="filter-group">
                    <label>Filtrar por nombre:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Ej: rex"
                    />
                </div>

                <div className="table-responsive">
                    <table className="rabbit-table">
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
                                        <button className="edit-btn" onClick={() => handleSelect(race)}>
                                            Editar
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

                {/* Modal para editar raza */}
                {selectedRace && (
                    <div className="modal-edit-race">
                        <div className="modal-edit-race-content">
                            <form onSubmit={handleSubmit} className="edit-form">
                                <h3>Editar Raza: {selectedRace.name}</h3>
                                <div className="form-group">
                                    <label>Nombre:</label>
                                    <input type="text" value={selectedRace.name} readOnly />
                                </div>
                                <div className="form-group">
                                    <label>Descripción:</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="edit-form-btns">
                                    <button type="submit" className="submit-btn">Guardar Cambios</button>
                                    <button type="button" className="cancel-btn" onClick={handleCancel}>Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RaceEdit;

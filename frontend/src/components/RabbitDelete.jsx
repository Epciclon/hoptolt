import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/RabbitDelete.css';

const RabbitDelete = () => {
    const [rabbits, setRabbits] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedRabbit, setSelectedRabbit] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchRabbits = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/rabbits');
                setRabbits(response.data);
            } catch (err) {
                setError('Error al obtener los conejos');
            }
        };
        fetchRabbits();
    }, []);

    const filteredRabbits = rabbits.filter(r =>
        r.code.toLowerCase().includes(filter.toLowerCase())
    );

    const handleDelete = async () => {
        try {
            await axios.delete(`http://localhost:5000/api/rabbits/${selectedRabbit.code}`);
            setMessage('Conejo eliminado correctamente.');
            setRabbits(rabbits.filter(r => r.code !== selectedRabbit.code));
            setSelectedRabbit(null);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al eliminar el conejo. Intente más tarde.';
            setError(errorMessage);
        }
    };

    return (
        <div className="rabbit-delete-container">
            <div className="rabbit-delete-card">
                <h2>Eliminar Conejo</h2>
                {error && <p className="rabbit-delete-error-msg">{error}</p>}
                {message && <p className="rabbit-delete-success-msg">{message}</p>}

                <div className="rabbit-delete-filter-group">
                    <label>Filtrar por código:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Ej: R001"
                    />
                </div>

                {!selectedRabbit && (
                    <div className="rabbit-delete-table-responsive">
                        <table className="rabbit-delete-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Sexo</th>
                                    <th>Edad (meses)</th>
                                    <th>Peso (kg)</th>
                                    <th>Propósito</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRabbits.map(rabbit => (
                                    <tr key={rabbit.code}>
                                        <td>{rabbit.code}</td>
                                        <td>{rabbit.sex}</td>
                                        <td>{rabbit.age}</td>
                                        <td>{rabbit.weight}</td>
                                        <td>{rabbit.purpose}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => setSelectedRabbit(rabbit)}>
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRabbits.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                                            No hay conejos para mostrar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedRabbit && (
                    <div className="rabbit-delete-confirm-delete">
                        <h3>¿Seguro que deseas eliminar este conejo?</h3>
                        <div className="rabbit-delete-confirm-details">
                            <p><strong>Código:</strong> {selectedRabbit.code}</p>
                            <p><strong>Sexo:</strong> {selectedRabbit.sex}</p>
                            <p><strong>Edad:</strong> {selectedRabbit.age} meses</p>
                            <p><strong>Peso:</strong> {selectedRabbit.weight} kg</p>
                            <p><strong>Propósito:</strong> {selectedRabbit.purpose}</p>
                        </div>
                        <div className="rabbit-delete-confirm-btns">
                            <button className="confirm-btn" onClick={handleDelete}>Confirmar Eliminar</button>
                            <button className="cancel-btn" onClick={() => setSelectedRabbit(null)}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RabbitDelete;
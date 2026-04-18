import React, { useState } from 'react';
import axios from 'axios';
import '../styles/RaceForm.css';

const RaceForm = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (!name || !description) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        try {
            await axios.post('/api/races', { name, description });
            setMessage('Raza registrada exitosamente.');
            setName('');
            setDescription('');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al registrar la raza.');
        }
    };

    return (
        <div className="race-form-container">
            <div className="race-form-card">
                <h2>Registrar Raza</h2>
                <form onSubmit={handleSubmit} className="race-form">
                    <div className="form-group">
                        <label>Nombre de la raza:</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
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
                    <button type="submit" className="submit-btn">Registrar Raza</button>
                </form>
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
            </div>
        </div>
    );
};


export default RaceForm;

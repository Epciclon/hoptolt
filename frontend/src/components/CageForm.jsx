import React, { useState } from 'react';
import axios from 'axios';
import '../styles/CageForm.css';

const CageForm = () => {
    const [number, setNumber] = useState('');
    const [type, setType] = useState('');
    const [capacity, setCapacity] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!number || !type || !capacity) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        if (!/^\d+$/.test(number) || Number(number) <= 0 || Number(number) > 999) {
            setError('El número de jaula debe ser un entero positivo menor o igual a 999.');
            return;
        }
        if (type === 'reproducción' && Number(capacity) !== 1) {
            setError('La capacidad máxima para jaula de reproducción es 1.');
            return;
        }
        if (type === 'engorde' && (Number(capacity) < 1 || Number(capacity) > 6)) {
            setError('La capacidad para jaula de engorde debe ser entre 1 y 6.');
            return;
        }

        try {
            await axios.post('/api/cages', { number, type, capacity });
            setMessage('Jaula registrada con éxito.');
            setNumber('');
            setType('');
            setCapacity('');
        } catch (err) {
            setError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Error al registrar la jaula.');
        }
    };

    return (
        <div className="cage-form-container">
            <div className="cage-form-card">
                <h2>Registrar Jaula</h2>
                <form onSubmit={handleSubmit} className="cage-form">
                    <div className="form-group">
                        <label>Número de jaula:</label>
                        <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={999} required />
                    </div>
                    <div className="form-group">
                        <label>Tipo de jaula:</label>
                        <select value={type} onChange={e => setType(e.target.value)} required>
                            <option value="">Seleccione tipo</option>
                            <option value="engorde">Engorde</option>
                            <option value="reproducción">Reproducción</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Capacidad:</label>
                        <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min={1} max={type === 'engorde' ? 6 : 1} required />
                    </div>
                    <button type="submit" className="submit-btn">Registrar Jaula</button>
                </form>
                {error && <p className="error-msg">{error}</p>}
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

export default CageForm;
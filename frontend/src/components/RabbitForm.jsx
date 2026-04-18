import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { validateRabbitData } from '../utils/validations';
import '../styles/RabbitForm.css';

const RabbitForm = () => {
    const [race, setRace] = useState('');
    const [code, setCode] = useState('');
    const [sex, setSex] = useState('macho');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [purpose, setPurpose] = useState('Reproducción');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [availableRaces, setAvailableRaces] = useState([]);

    // Cargar razas disponibles desde el backend
    useEffect(() => {
        const fetchRaces = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/rabbits/races');
                setAvailableRaces(response.data);
            } catch (err) {
                console.error('Error al cargar las razas:', err);
                // Fallback a razas predeterminadas si hay error
                setAvailableRaces([
                    { name: 'rex', description: 'Rex' },
                    { name: 'lionhead', description: 'Lionhead' },
                    { name: 'danes', description: 'Danés' }
                ]);
            }
        };
        fetchRaces();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Usar validaciones centralizadas
        const validationErrors = validateRabbitData({
            race,
            code,
            sex,
            age: parseInt(age),
            weight: parseFloat(weight),
            purpose
        });

        if (validationErrors.length > 0) {
            setError(validationErrors[0]); // Mostrar el primer error
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/rabbits', {
                race,
                code,
                sex,
                age: parseInt(age),
                weight: parseFloat(weight),
                purpose,
            });
            setMessage('Conejo registrado con éxito.');
            setError(''); // Limpiar errores previos
            // Limpiar el formulario
            setRace('');
            setCode('');
            setSex('macho');
            setAge('');
            setWeight('');
            setPurpose('Reproducción');
        } catch (err) {
            setMessage(''); // Limpiar mensajes de éxito previos
            const errorMessage = err.response?.data?.errors?.[0] || 
                               err.response?.data?.message || 
                               'Error al registrar el conejo. Intente más tarde.';
            setError(errorMessage);
        }
    };

    return (
        <div className="rabbit-form-container">
            <div className="rabbit-form-card">
                <h2>Registrar Conejo</h2>
                <form onSubmit={handleSubmit} className="rabbit-form">
                    <div className="form-group">
                        <label>Raza:</label>
                        <select value={race} onChange={(e) => setRace(e.target.value)} required>
                            <option value="">Seleccione una raza</option>
                            {availableRaces.map((raceItem) => (
                                <option key={raceItem.name} value={raceItem.name}>
                                    {raceItem.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Código:</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder={race ? `Ej: ${race.charAt(0).toUpperCase()}001` : "Ej: R001"}
                            maxLength={4}
                            required
                        />
                        <small className="help-text">
                            Formato: Primera letra de la raza y tres dígitos
                            {race && ` (ej: ${race.charAt(0).toUpperCase()}001)`}
                        </small>
                    </div>
                    <div className="form-group">
                        <label>Sexo:</label>
                        <select value={sex} onChange={(e) => setSex(e.target.value)} required>
                            <option value="macho">Macho</option>
                            <option value="hembra">Hembra</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Edad (meses):</label>
                        <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            min={0}
                            max={12}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Peso (kg):</label>
                        <input
                            type="number"
                            step="0.01"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            min={0.01}
                            max={4.5}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Propósito:</label>
                        <select value={purpose} onChange={(e) => setPurpose(e.target.value)} required>
                            <option value="Reproducción">Reproducción</option>
                            <option value="Engorde">Engorde</option>
                        </select>
                    </div>
                    <button type="submit" className="submit-btn">Registrar Conejo</button>
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

export default RabbitForm;
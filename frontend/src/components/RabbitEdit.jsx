import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { validateRabbitData } from '../utils/validations';
import '../styles/RabbitEdit.css';

const RabbitEdit = () => {
    const [rabbits, setRabbits] = useState([]);
    const [filter, setFilter] = useState('');
    const [selectedRabbit, setSelectedRabbit] = useState(null);
    const [editData, setEditData] = useState({
        race: '',
        code: '',
        sex: 'macho',
        age: '',
        weight: '',
        purpose: 'Reproducción'
    });
    const [availableRaces, setAvailableRaces] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Cargar conejos
        axios.get('http://localhost:5000/api/rabbits')
            .then(res => {
                setRabbits(res.data);
            })
            .catch(() => setRabbits([]));

        // Cargar razas disponibles
        axios.get('http://localhost:5000/api/rabbits/races')
            .then(res => {
                setAvailableRaces(res.data);
            })
            .catch(() => {
                setAvailableRaces([
                    { name: 'rex', description: 'Rex' },
                    { name: 'lionhead', description: 'Lionhead' },
                    { name: 'danes', description: 'Danés' }
                ]);
            });
    }, []);

    const filteredRabbits = Array.isArray(rabbits)
        ? rabbits.filter(rabbit =>
            rabbit &&
            rabbit.code &&
            (rabbit.code.toLowerCase().includes(filter.toLowerCase().trim()) ||
             rabbit.race.toLowerCase().includes(filter.toLowerCase().trim()))
        )
        : [];

    const handleSelect = (rabbit) => {
        setSelectedRabbit(rabbit);
        setEditData({
            race: rabbit.race,
            code: rabbit.code,
            sex: rabbit.sex,
            age: rabbit.age.toString(),
            weight: rabbit.weight.toString(),
            purpose: rabbit.purpose
        });
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

        // Preparar datos para validación (incluyendo raza y código para validación local)
        const dataForValidation = {
            ...editData,
            age: parseInt(editData.age),
            weight: parseFloat(editData.weight)
        };

        // Validar datos
        const validationErrors = validateRabbitData(dataForValidation);

        if (validationErrors.length > 0) {
            setError(validationErrors[0]);
            return;
        }

        try {
            // Enviar solo los campos editables al backend
            const editableData = {
                sex: editData.sex,
                age: parseInt(editData.age),
                weight: parseFloat(editData.weight),
                purpose: editData.purpose
            };

            await axios.put(`http://localhost:5000/api/rabbits/${selectedRabbit.code}`, editableData);
            setMessage('Conejo actualizado con éxito.');
            
            // Actualizar la lista de conejos
            const response = await axios.get('http://localhost:5000/api/rabbits');
            setRabbits(response.data);
            
            // Limpiar selección
            setSelectedRabbit(null);
            setEditData({
                race: '',
                code: '',
                sex: 'macho',
                age: '',
                weight: '',
                purpose: 'Reproducción'
            });
        } catch (err) {
            const errorMessage = err.response?.data?.errors?.[0] || 
                               err.response?.data?.message || 
                               'Error al actualizar el conejo.';
            setError(errorMessage);
        }
    };

    const handleCancel = () => {
        setSelectedRabbit(null);
        setEditData({
            race: '',
            code: '',
            sex: 'macho',
            age: '',
            weight: '',
            purpose: 'Reproducción'
        });
        setMessage('');
        setError('');
    };

    return (
        <div className="rabbit-edit-container">
            {selectedRabbit && (
                <div className="edit-form-overlay">
                    <div className="edit-form-card">
                        <h3>Editar Conejo: {selectedRabbit.code}</h3>
                        <form onSubmit={handleSubmit} className="edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Raza:</label>
                                    <select 
                                        name="race" 
                                        value={editData.race} 
                                        onChange={handleChange} 
                                        required
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    >
                                        <option value="">Seleccione una raza</option>
                                        {availableRaces.map((raceItem) => (
                                            <option key={raceItem.name} value={raceItem.name}>
                                                {raceItem.name}
                                            </option>
                                        ))}
                                    </select>
                                    <small style={{ color: '#666', fontSize: '0.8em' }}>
                                        La raza no se puede modificar
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label>Código:</label>
                                    <input
                                        type="text"
                                        name="code"
                                        value={editData.code}
                                        onChange={handleChange}
                                        maxLength={4}
                                        required
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                                    />
                                    <small style={{ color: '#666', fontSize: '0.8em' }}>
                                        El código no se puede modificar
                                    </small>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sexo:</label>
                                    <select 
                                        name="sex" 
                                        value={editData.sex} 
                                        onChange={handleChange} 
                                        required
                                    >
                                        <option value="macho">Macho</option>
                                        <option value="hembra">Hembra</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Edad (meses):</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={editData.age}
                                        onChange={handleChange}
                                        min={0}
                                        max={12}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Peso (kg):</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="weight"
                                        value={editData.weight}
                                        onChange={handleChange}
                                        min={0.01}
                                        max={4.5}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Propósito:</label>
                                    <select 
                                        name="purpose" 
                                        value={editData.purpose} 
                                        onChange={handleChange} 
                                        required
                                    >
                                        <option value="Reproducción">Reproducción</option>
                                        <option value="Engorde">Engorde</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-buttons">
                                <button type="submit" className="save-btn">Guardar Cambios</button>
                                <button type="button" onClick={handleCancel} className="cancel-btn">Cancelar</button>
                            </div>
                        </form>
                        {message && <p className="success-msg">{message}</p>}
                        {error && <p className="error-msg">{error}</p>}
                    </div>
                </div>
            )}

            <div className="rabbit-edit-card">
                <h2>Editar Conejo</h2>
                {error && <p className="error-msg">{error}</p>}
                {message && <p className="success-msg">{message}</p>}
                
                <div className="filter-group">
                    <label>Filtrar por código o raza:</label>
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Ej: R001 o Rex"
                    />
                </div>
                
                <div className="table-responsive">
                    <table className="rabbit-table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Raza</th>
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
                                    <td>{rabbit.race}</td>
                                    <td>{rabbit.sex}</td>
                                    <td>{rabbit.age}</td>
                                    <td>{rabbit.weight}</td>
                                    <td>{rabbit.purpose}</td>
                                    <td>
                                        <button className="edit-btn" onClick={() => handleSelect(rabbit)}>
                                            Editar
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
            </div>
        </div>
    );
};

export default RabbitEdit;
import React, { useState, useEffect } from 'react';
import '../styles/VaccinationReport.css';

const VaccinationReport = () => {
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        races: []
    });
    const [availableRaces, setAvailableRaces] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    // Cargar razas disponibles al montar el componente
    useEffect(() => {
        fetchAvailableRaces();
    }, []);

    const fetchAvailableRaces = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/reports/available-races');
            const data = await response.json();
            if (response.ok) {
                setAvailableRaces(data.races);
            } else {
                setError('Error al cargar las razas disponibles');
            }
        } catch (err) {
            setError('Error de conexión al cargar las razas');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleRaceChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            races: checked 
                ? [...prev.races, value]
                : prev.races.filter(race => race !== value)
        }));
        setError('');
    };

    const validateForm = () => {
        if (!formData.startDate) {
            setError('La fecha de inicio es obligatoria');
            return false;
        }
        if (!formData.endDate) {
            setError('La fecha de fin es obligatoria');
            return false;
        }
        if (formData.races.length === 0) {
            setError('Debe seleccionar al menos una raza');
            return false;
        }
        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            setError('La fecha de fin no puede ser menor a la fecha de inicio');
            return false;
        }
        return true;
    };

    const generateReportPreview = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError('');
        
        try {
            const response = await fetch('http://localhost:5000/api/reports/vaccination-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setReportData(data.reportData);
                setShowPreview(true);
                setMessage('Reporte generado exitosamente');
            } else {
                setError(data.message || 'Error al generar el reporte');
            }
        } catch (err) {
            setError('Error de conexión al generar el reporte');
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (!reportData) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/reports/vaccination-report/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Reporte_Vacunacion_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                setMessage('PDF descargado exitosamente');
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Error al generar el PDF');
            }
        } catch (err) {
            setError('Error de conexión al descargar el PDF');
        } finally {
            setLoading(false);
        }
    };

    const clearForm = () => {
        setFormData({
            startDate: '',
            endDate: '',
            races: []
        });
        setReportData(null);
        setShowPreview(false);
        setError('');
        setMessage('');
    };

    return (
        <div className="vaccination-report-container">
            <div className="report-header">
                <h2>💉 Generar Reporte de Vacunación</h2>
                <p>Genere reportes de vacunación por raza y período de tiempo</p>
            </div>

            {!showPreview ? (
                <form onSubmit={generateReportPreview} className="form-section">
                    <div className="form-group">
                        <label htmlFor="startDate">Fecha de Inicio:</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="endDate">Fecha de Fin:</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Razas a incluir:</label>
                        <div className="checkbox-group">
                            {availableRaces.map(race => (
                                <label key={race} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        value={race}
                                        checked={formData.races.includes(race)}
                                        onChange={handleRaceChange}
                                        className="checkbox-input"
                                    />
                                    <span className="checkbox-text">{race}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    {message && (
                        <div className="success-message">
                            ✅ {message}
                        </div>
                    )}

                    <div className="button-group">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? '🔄 Generando...' : '💉 Vista Previa del Reporte'}
                        </button>
                        <button
                            type="button"
                            onClick={clearForm}
                            className="btn-secondary"
                        >
                            🔄 Limpiar Formulario
                        </button>
                    </div>
                </form>
            ) : (
                <div className="preview-section">
                    <div className="preview-header">
                        <h3>📋 Vista Previa del Reporte de Vacunación</h3>
                        <div className="preview-info">
                            <p><strong>Empresa:</strong> {reportData?.companyName || 'No especificada'}</p>
                            <p><strong>Período:</strong> {reportData?.startDate || 'N/A'} - {reportData?.endDate || 'N/A'}</p>
                            <p><strong>Razas incluidas:</strong> {reportData?.selectedRaces?.join(', ') || 'Ninguna'}</p>
                            <p><strong>Total de registros:</strong> {reportData?.totalRecords || 0}</p>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Jaula</th>
                                    <th>Código de Conejo</th>
                                    <th>Raza</th>
                                    <th>Fecha de Vacunación</th>
                                    <th>Vacunas Aplicadas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData && reportData.data && reportData.data.length > 0 ? (
                                    reportData.data.map((row, index) => (
                                        <tr key={index}>
                                            <td className="center">{row.jaula}</td>
                                            <td className="center">{row.codigo}</td>
                                            <td>{row.raza}</td>
                                            <td className="center">{row.fecha}</td>
                                            <td>{row.vacunasAplicadas}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="center">
                                            {reportData ? 'No se encontraron datos para mostrar' : 'Cargando datos...'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    {message && (
                        <div className="success-message">
                            ✅ {message}
                        </div>
                    )}

                    <div className="button-group">
                        <button
                            onClick={downloadPDF}
                            disabled={loading}
                            className="btn-success"
                        >
                            {loading ? '🔄 Generando PDF...' : '📄 Descargar PDF'}
                        </button>
                        <button
                            onClick={() => setShowPreview(false)}
                            disabled={loading}
                            className="btn-secondary"
                        >
                            🔙 Volver al Formulario
                        </button>
                        <button
                            onClick={clearForm}
                            disabled={loading}
                            className="btn-warning"
                        >
                            🗑️ Nuevo Reporte
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VaccinationReport;

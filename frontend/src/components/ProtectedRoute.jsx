import React from 'react';
import { useAuth } from '../utils/AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children, requireRole = null }) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Mostrar loader mientras se verifica la autenticación
    if (isLoading) {
        return (
            <div className="loading-container" data-testid="loading-container">
                <div className="loading-spinner" data-testid="loading-spinner">
                    <div className="spinner-ring"></div>
                    <p>Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    // Si no está autenticado, mostrar login
    if (!isAuthenticated) {
        return <Login />;
    }

    // Si se requiere un rol específico y el usuario no lo tiene
    if (requireRole && user.role !== requireRole) {
        return (
            <div className="access-denied-container">
                <div className="access-denied-card">
                    <div className="access-denied-icon">🚫</div>
                    <h2>Acceso Denegado</h2>
                    <p>No tienes permisos suficientes para acceder a esta sección.</p>
                    <p>Rol requerido: <strong>{requireRole}</strong></p>
                    <p>Tu rol actual: <strong>{user.role}</strong></p>
                </div>
            </div>
        );
    }

    // Usuario autenticado y con permisos, mostrar contenido
    return children;
};

export default ProtectedRoute;

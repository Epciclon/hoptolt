import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../utils/AuthContext';
import '../styles/Login.css';

// Esquema de validación
const loginSchema = yup.object().shape({
    username: yup
        .string()
        .required('Usuario o email requerido')
        .min(3, 'Mínimo 3 caracteres'),
    password: yup
        .string()
        .required('Contraseña requerida')
        .min(1, 'Contraseña requerida')
});

const Login = ({ onLoginSuccess }) => {
    const { login, isLoading, error, clearError } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(loginSchema),
        mode: 'onBlur'
    });

    // Efecto de fade in al montar el componente
    useEffect(() => {
        setFadeIn(true);
        return () => clearError();
    }, [clearError]);

    // Manejar envío del formulario
    const onSubmit = async (data) => {
        setIsSubmitting(true);
        clearError();

        try {
            const result = await login(data);
            
            if (result.success) {
                reset();
                onLoginSuccess && onLoginSuccess();
            }
        } catch (error) {
            console.error('Error en login:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Alternar visibilidad de contraseña
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className={`login-container ${fadeIn ? 'fade-in' : ''}`}>
            {/* Fondo animado */}
            <div className="login-background">
                <div className="animated-shapes">
                    <div className="shape shape-1"></div>
                    <div className="shape shape-2"></div>
                    <div className="shape shape-3"></div>
                    <div className="shape shape-4"></div>
                    <div className="shape shape-5"></div>
                </div>
            </div>

            {/* Contenedor principal */}
            <div className="login-wrapper">
                {/* Panel izquierdo - Información de la empresa */}
                <div className="login-info-panel">
                    <div className="company-branding">
                        <div className="company-logo">
                            <div className="logo-icon">
                                <svg viewBox="0 0 100 100" className="rabbit-icon">
                                    <circle cx="50" cy="35" r="15" fill="currentColor" opacity="0.8"/>
                                    <ellipse cx="42" cy="28" rx="4" ry="8" fill="currentColor"/>
                                    <ellipse cx="58" cy="28" rx="4" ry="8" fill="currentColor"/>
                                    <circle cx="45" cy="32" r="2" fill="white"/>
                                    <circle cx="55" cy="32" r="2" fill="white"/>
                                    <ellipse cx="50" cy="65" rx="20" ry="25" fill="currentColor" opacity="0.9"/>
                                    <circle cx="30" cy="85" r="8" fill="currentColor" opacity="0.7"/>
                                    <circle cx="70" cy="85" r="8" fill="currentColor" opacity="0.7"/>
                                </svg>
                            </div>
                            <h1 className="company-name">Holptolt</h1>
                        </div>
                        <h2 className="company-title">Sistema de Gestión de Conejos</h2>
                        <p className="company-description">
                            Plataforma integral para el manejo profesional de su crianza de conejos. 
                            Controle alimentación, vacunación, reproducción y genere reportes detallados.
                        </p>
                        
                        <div className="features-list">
                            <div className="feature-item">
                                <div className="feature-icon">📊</div>
                                <span>Reportes Detallados</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">🐰</div>
                                <span>Gestión Integral</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">📈</div>
                                <span>Control de Crecimiento</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">💉</div>
                                <span>Control Sanitario</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel derecho - Formulario de login */}
                <div className="login-form-panel">
                    <div className="login-form-container">
                        <div className="login-header">
                            <h2 className="login-title">Iniciar Sesión</h2>
                            <p className="login-subtitle">Acceda a su cuenta para continuar</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="login-form" data-testid="login-form">
                            {/* Campo de usuario */}
                            <div className="form-group">
                                <label htmlFor="username" className="form-label">
                                    Usuario o Email
                                </label>
                                <div className="input-wrapper">
                                    <input
                                        {...register('username')}
                                        type="text"
                                        id="username"
                                        className={`form-input ${errors.username ? 'error' : ''}`}
                                        placeholder="Ingrese su usuario o email"
                                        autoComplete="username"
                                        data-testid="username-input"
                                    />
                                </div>
                                {errors.username && (
                                    <span className="error-message">{errors.username.message}</span>
                                )}
                            </div>

                            {/* Campo de contraseña */}
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">
                                    Contraseña
                                </label>
                                <div className="input-wrapper">
                                    <input
                                        {...register('password')}
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        className={`form-input ${errors.password ? 'error' : ''}`}
                                        placeholder="Ingrese su contraseña"
                                        autoComplete="current-password"
                                        data-testid="password-input"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={togglePasswordVisibility}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        data-testid="password-toggle"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            {showPassword ? (
                                                <path d="M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.09L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.76,7.13 11.37,7 12,7Z"/>
                                            ) : (
                                                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="error-message">{errors.password.message}</span>
                                )}
                            </div>

                            {/* Mostrar error global */}
                            {error && (
                                <div className="alert alert-error" data-testid="error-message">
                                    <div className="alert-icon">⚠️</div>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Botón de envío */}
                            <button
                                type="submit"
                                className={`login-button ${isSubmitting || isLoading ? 'loading' : ''}`}
                                disabled={isSubmitting || isLoading}
                                data-testid="login-submit"
                            >
                                <span className="button-content">
                                    {isSubmitting || isLoading ? (
                                        <>
                                            <div className="spinner"></div>
                                            Iniciando sesión...
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" className="button-icon">
                                                <path d="M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"/>
                                            </svg>
                                            Iniciar Sesión
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        {/* Footer del formulario */}
                        <div className="login-footer">
                            <p className="footer-text">
                                ¿Problemas para acceder? Contacte al administrador del sistema.
                            </p>
                            <div className="footer-info">
                                <span className="version-info">v1.0.0</span>
                                <span className="separator">•</span>
                                <span className="company-info">© 2025 Holptolt</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

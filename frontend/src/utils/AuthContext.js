import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

// Estado inicial
const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
};

// Tipos de acciones
const AUTH_ACTIONS = {
    LOGIN_START: 'LOGIN_START',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    SET_LOADING: 'SET_LOADING',
    CLEAR_ERROR: 'CLEAR_ERROR',
    UPDATE_USER: 'UPDATE_USER'
};

// Reducer
const authReducer = (state, action) => {
    switch (action.type) {
        case AUTH_ACTIONS.LOGIN_START:
            return {
                ...state,
                isLoading: true,
                error: null
            };
        
        case AUTH_ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                isLoading: false,
                error: null
            };
        
        case AUTH_ACTIONS.LOGIN_FAILURE:
            return {
                ...state,
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: action.payload
            };
        
        case AUTH_ACTIONS.LOGOUT:
            return {
                ...initialState,
                isLoading: false
            };
        
        case AUTH_ACTIONS.SET_LOADING:
            return {
                ...state,
                isLoading: action.payload
            };
        
        case AUTH_ACTIONS.CLEAR_ERROR:
            return {
                ...state,
                error: null
            };
        
        case AUTH_ACTIONS.UPDATE_USER:
            return {
                ...state,
                user: action.payload
            };
        
        default:
            return state;
    }
};

// Crear contexto
const AuthContext = createContext();

// Hook personalizado para usar el contexto
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

// Configurar axios con interceptors
let requestInterceptor = null;
let responseInterceptor = null;

const setupAxiosInterceptors = (token, logout) => {
    // Limpiar interceptors previos
    if (requestInterceptor !== null) {
        axios.interceptors.request.eject(requestInterceptor);
    }
    if (responseInterceptor !== null) {
        axios.interceptors.response.eject(responseInterceptor);
    }

    // Request interceptor - agregar token a todas las requests
    requestInterceptor = axios.interceptors.request.use(
        (config) => {
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - manejar errores de autenticación
    responseInterceptor = axios.interceptors.response.use(
        (response) => {
            return response;
        },
        (error) => {
            if (error.response?.status === 401) {
                // Token expirado o inválido
                logout();
            }
            return Promise.reject(error);
        }
    );
};

// Proveedor del contexto
export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Función para login
    const login = async (credentials) => {
        try {
            dispatch({ type: AUTH_ACTIONS.LOGIN_START });

            const response = await axios.post('/api/auth/login', credentials);
            
            if (response.data.success) {
                const { user, token } = response.data.data;
                
                // Guardar token en cookie segura
                Cookies.set('authToken', token, {
                    expires: 1, // 1 día
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });

                // Actualizar estado
                dispatch({
                    type: AUTH_ACTIONS.LOGIN_SUCCESS,
                    payload: { user, token }
                });

                // Configurar axios con el nuevo token
                setupAxiosInterceptors(token, logout);

                return { success: true };
            } else {
                throw new Error(response.data.message || 'Error en el login');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Error de conexión';
            
            dispatch({
                type: AUTH_ACTIONS.LOGIN_FAILURE,
                payload: errorMessage
            });

            return { success: false, error: errorMessage };
        }
    };

    // Función para logout
    const logout = async () => {
        try {
            // Intentar notificar al servidor (opcional)
            if (state.token) {
                await axios.post('/api/auth/logout');
            }
        } catch (error) {
            // Ignorar errores del logout en el servidor
            console.warn('Error en logout del servidor:', error);
        } finally {
            // Limpiar datos locales
            Cookies.remove('authToken');
            
            // Limpiar interceptors de axios correctamente
            if (requestInterceptor !== null) {
                axios.interceptors.request.eject(requestInterceptor);
                requestInterceptor = null;
            }
            if (responseInterceptor !== null) {
                axios.interceptors.response.eject(responseInterceptor);
                responseInterceptor = null;
            }
            
            // Recargar la página para limpiar completamente el estado
            window.location.reload();
            
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
    };

    // Función para verificar token
    const verifyToken = async (token) => {
        try {
            const response = await axios.get('/api/auth/verify-token', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                return { valid: true, user: response.data.data.user };
            }
        } catch (error) {
            console.warn('Token inválido:', error);
        }
        
        return { valid: false };
    };

    // Función para actualizar perfil
    const updateProfile = async (profileData) => {
        try {
            const response = await axios.put('/api/auth/profile', profileData);
            
            if (response.data.success) {
                dispatch({
                    type: AUTH_ACTIONS.UPDATE_USER,
                    payload: response.data.data.user
                });
                return { success: true };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error actualizando perfil';
            return { success: false, error: errorMessage };
        }
    };

    // Función para cambiar contraseña
    const changePassword = async (passwordData) => {
        try {
            const response = await axios.put('/api/auth/change-password', passwordData);
            
            if (response.data.success) {
                return { success: true };
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error cambiando contraseña';
            return { success: false, error: errorMessage };
        }
    };

    // Función para limpiar errores
    const clearError = () => {
        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    };

    // Inicializar autenticación al cargar la app
    useEffect(() => {
        const initializeAuth = async () => {
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

            const token = Cookies.get('authToken');
            
            if (token) {
                const { valid, user } = await verifyToken(token);
                
                if (valid) {
                    dispatch({
                        type: AUTH_ACTIONS.LOGIN_SUCCESS,
                        payload: { user, token }
                    });
                    
                    setupAxiosInterceptors(token, logout);
                } else {
                    // Token inválido, remover cookie
                    Cookies.remove('authToken');
                    dispatch({ type: AUTH_ACTIONS.LOGOUT });
                }
            } else {
                dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }

            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        };

        initializeAuth();
    }, []);

    // Valor del contexto
    const value = {
        ...state,
        login,
        logout,
        updateProfile,
        changePassword,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

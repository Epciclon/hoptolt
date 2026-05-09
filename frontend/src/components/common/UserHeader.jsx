import React, { useState } from 'react';
import '../../styles/UserHeader.css';

const UserHeader = () => {
    const [showDropdown, setShowDropdown] = useState(false);

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    return (
        <div className="user-header">
            <div className="user-info-container">
                <div className="user-avatar" onClick={toggleDropdown}>
                    <span className="user-initials">S</span>
                    <div className="status-indicator"></div>
                </div>
                
                <div className="user-details">
                    <span className="user-name">Sistema</span>
                    <span className="user-role">Gestión</span>
                </div>

                <button 
                    className="dropdown-toggle"
                    onClick={toggleDropdown}
                    aria-label="Menú de usuario"
                >
                    <svg viewBox="0 0 24 24" className="dropdown-icon">
                        <path d="M7,10L12,15L17,10H7Z"/>
                    </svg>
                </button>

                {showDropdown && (
                    <div className="user-dropdown">
                        <div className="dropdown-header">
                            <div className="dropdown-avatar">
                                <span className="dropdown-initials">S</span>
                            </div>
                            <div className="dropdown-info">
                                <span className="dropdown-name">Sistema de Gestión</span>
                                <span className="dropdown-email">sistema@hoptolt.com</span>
                                <span className="dropdown-role">Gestión</span>
                            </div>
                        </div>
                        
                        <div className="dropdown-divider"></div>
                        
                        <div className="dropdown-menu">
                            <button className="dropdown-item" onClick={() => setShowDropdown(false)}>
                                <svg viewBox="0 0 24 24" className="dropdown-item-icon">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                                </svg>
                                Mi Perfil
                            </button>
                            
                            <button className="dropdown-item" onClick={() => setShowDropdown(false)}>
                                <svg viewBox="0 0 24 24" className="dropdown-item-icon">
                                    <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                                </svg>
                                Configuración
                            </button>
                        </div>
                        
                        <div className="dropdown-footer">
                            <span className="version-info">Sistema v1.0.0</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay para cerrar dropdown al hacer clic fuera */}
            {showDropdown && (
                <div 
                    className="dropdown-overlay"
                    onClick={() => setShowDropdown(false)}
                ></div>
            )}
        </div>
    );
};

export default UserHeader;

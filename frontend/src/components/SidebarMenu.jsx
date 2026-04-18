import React, { useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import '../styles/SidebarMenu.css';

const SidebarMenu = () => {
  const { logout, user } = useAuth();
  const [openCage, setOpenCage]     = useState(false);
  const [openRace, setOpenRace]     = useState(false);
  const [openRabbit, setOpenRabbit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openMating, setOpenMating] = useState(false);
  const [openFeeding, setOpenFeeding] = useState(false); 
  const [openVaccination, setOpenVaccination] = useState(false);
  const [openDeworming, setOpenDeworming] = useState(false); 
  const [openGrowth, setOpenGrowth] = useState(false);
  const [openBreeding, setOpenBreeding] = useState(false); // Nuevo estado para Gestionar Crianza
  const [openReports, setOpenReports] = useState(false); // Nuevo estado para Generar Reportes
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Estado para el modal
  const history                     = useHistory();
  const location                    = useLocation();

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleBack = () => {
    setOpenCage(false);
    setOpenRace(false);
    setOpenRabbit(false);
    setOpenAssign(false);
    setOpenMating(false); 
    setOpenFeeding(false); 
    setOpenVaccination(false);
    setOpenDeworming(false);
    setOpenGrowth(false);
    setOpenBreeding(false);
    setOpenReports(false);
    history.push('/');
  };

  const handleBackToBreeding = () => {
    setOpenCage(false);
    setOpenRace(false);
    setOpenRabbit(false);
    setOpenAssign(false);
    setOpenMating(false); 
    setOpenFeeding(false); 
    setOpenVaccination(false);
    setOpenDeworming(false);
    setOpenGrowth(false);
    setOpenBreeding(true);
    setOpenReports(false);
    history.push('/');
  };

  const handleBackToReports = () => {
    setOpenCage(false);
    setOpenRace(false);
    setOpenRabbit(false);
    setOpenAssign(false);
    setOpenMating(false); 
    setOpenFeeding(false); 
    setOpenVaccination(false);
    setOpenDeworming(false);
    setOpenGrowth(false);
    setOpenBreeding(false);
    setOpenReports(true);
    history.push('/');
  };

  // Menú Jaulas
  if (
    openCage ||
    ['/register-cage', '/edit-cage', '/delete-cage'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Gestionar Jaulas</h2>
        <ul>
          <li><Link to="/register-cage">Registrar Jaula</Link></li>
          <li><Link to="/edit-cage">Editar Jaula</Link></li>
          <li><Link to="/delete-cage">Eliminar Jaula</Link></li>
        </ul>
      </div>
    );
  }

  // Menú Razas
  if (
    openRace ||
    ['/register-race', '/edit-race', '/delete-race'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Gestionar Razas</h2>
        <ul>
          <li><Link to="/register-race">Registrar Raza</Link></li>
          <li><Link to="/edit-race">Editar Raza</Link></li>
          <li><Link to="/delete-race">Eliminar Raza</Link></li>
        </ul>
      </div>
    );
  }

  // Menú Conejos
  if (
    openRabbit ||
    ['/register-rabbit', '/edit-rabbit', '/delete-rabbit'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Gestionar Conejos</h2>
        <ul>
          <li><Link to="/register-rabbit">Registrar Conejo</Link></li>
          <li><Link to="/edit-rabbit">Editar Conejo</Link></li>
          <li><Link to="/delete-rabbit">Eliminar Conejo</Link></li>
        </ul>
      </div>
    );
  }

  // Menú Asignar Conejo a Jaula
  if (
    openAssign ||
    ['/assign-rabbit-cage'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Asignar Conejo a Jaula</h2>
      </div>
    );
  }

  // Menú Reproducción y Parto
  if (
    openMating ||
    ['/mating-register', '/mating-delete'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Gestionar Reproducción y Parto</h2>
        <ul>
          <li>
            <Link to="/mating-register" className="submenu-link">
              Registrar Monta
            </Link>
          </li>
          <li>
            <Link to="/mating-delete" className="submenu-link">
              Eliminar Parto
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  // Menú Control de Alimentación
  if (
    openFeeding ||
    ['/feeding-control'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Control de Alimentación</h2>
      </div>
    );
  }

  // Menú Control de Vacunación
  if (
    openVaccination ||
    ['/vaccination-control'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Control de Vacunación</h2>
      </div>
    );
  }

  // Menú Control de Desparasitación
  if (
    openDeworming ||
    ['/deworming-control'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Control de Desparasitación</h2>
      </div>
    );
  }

  // Menú Control de Crecimiento
  if (
    openGrowth ||
    ['/growth-control'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBackToBreeding}>← Volver a Gestionar Crianza</button>
        <h2>Control de Crecimiento</h2>
      </div>
    );
  }

  // Menú Gestionar Crianza (nuevo menú padre)
  if (openBreeding) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBack}>← Volver al Menú Principal</button>
        <h2>Gestionar Crianza</h2>
        <ul>
          <li>
            <button className="main-tab" onClick={() => setOpenCage(true)}>
              <span className="main-tab-icon">🗄️</span>
              Gestionar Jaulas
            </button>
          </li>
          <li>
            <button className="main-tab" onClick={() => setOpenRace(true)}>
              <span className="main-tab-icon">🏷️</span>
              Gestionar Razas
            </button>
          </li>
          <li>
            <button className="main-tab" onClick={() => setOpenRabbit(true)}>
              <span className="main-tab-icon">🐰</span>
              Gestionar Conejos
            </button>
          </li>
          <li>
            <button
              className="main-tab"
              onClick={() => {
                setOpenAssign(true);
                history.push('/assign-rabbit-cage');
              }}
            >
              <span className="main-tab-icon">🔗</span>
              Asignar Conejo a Jaula
            </button>
          </li>
          <li>
            <button className="main-tab" onClick={() => setOpenMating(true)}>
              <span className="main-tab-icon">🐇</span>
              Gestionar Reproducción y Parto
            </button>
          </li>
          <li>
            <button
              className="main-tab"
              onClick={() => {
                setOpenFeeding(true);
                history.push('/feeding-control');
              }}
            >
              <span className="main-tab-icon">📋</span>
              Control de Alimentación
            </button>
          </li>
          <li>
            <button
              className="main-tab"
              onClick={() => {
                setOpenVaccination(true);
                history.push('/vaccination-control');
              }}
            >
              <span className="main-tab-icon">💉</span>
              Control de Vacunación
            </button>
          </li>
          <li>
            <button
              className="main-tab"
              onClick={() => {
                setOpenDeworming(true);
                history.push('/deworming-control');
              }}
            >
              <span className="main-tab-icon">🐛</span>
              Control de Desparasitación
            </button>
          </li>
          <li>
            <button
              className="main-tab"
              onClick={() => {
                setOpenGrowth(true);
                history.push('/growth-control');
              }}
            >
              <span className="main-tab-icon">📊</span>
              Control de Crecimiento
            </button>
          </li>
        </ul>
      </div>
    );
  }

  // Menú Generar Reportes (nuevo menú padre)
  if (
    openReports ||
    ['/feeding-report', '/vaccination-report', '/deworming-report'].includes(location.pathname)
  ) {
    return (
      <div className="sidebar-menu">
        <button className="back-btn" onClick={handleBack}>← Volver al Menú Principal</button>
        <h2>Generar Reportes</h2>
        <ul>
          <li>
            <Link to="/feeding-report">
              <span className="main-tab-icon">🍽️</span>
              Reporte de Alimentación
            </Link>
          </li>
          <li>
            <Link to="/vaccination-report">
              <span className="main-tab-icon">💉</span>
              Reporte de Vacunas
            </Link>
          </li>
          <li>
            <Link to="/deworming-report">
              <span className="main-tab-icon">🧬</span>
              Reporte de Desparasitación
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  // Menú Principal
  return (
    <div className="sidebar-menu" data-testid="sidebar-menu">
      <div className="user-info">
        <div className="user-avatar">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="user-details">
          <span className="user-name">{user?.name || 'Usuario'}</span>
          <span className="user-role">{user?.role || 'Empleado'}</span>
        </div>
      </div>
      
      <ul>
        <li>
          <button className="main-tab" onClick={() => setOpenBreeding(true)} data-testid="nav-breeding">
            <span className="main-tab-icon">🐰</span>
            Gestionar Crianza
          </button>
        </li>
        <li>
          <button className="main-tab" onClick={() => setOpenReports(true)} data-testid="nav-reports">
            <span className="main-tab-icon">📋</span>
            Generar Reportes
          </button>
        </li>
      </ul>
      
      <div className="logout-section">
        <button className="logout-btn" onClick={handleLogout} data-testid="logout-button">
          <span className="logout-icon">🚪</span>
          Cerrar Sesión
        </button>
      </div>
      
      {/* Modal de confirmación de logout */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-header">
              <h3>Confirmar Cierre de Sesión</h3>
            </div>
            <div className="logout-modal-body">
              <p>¿Estás seguro de que quieres cerrar sesión?</p>
              <p className="logout-modal-subtitle">Se perderán todos los datos no guardados.</p>
            </div>
            <div className="logout-modal-footer">
              <button className="logout-cancel-btn" onClick={cancelLogout} data-testid="logout-cancel">
                Cancelar
              </button>
              <button className="logout-confirm-btn" onClick={confirmLogout} data-testid="logout-confirm">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarMenu;

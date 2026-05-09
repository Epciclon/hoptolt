import React, { useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import '../../styles/SidebarMenu.css';

const SidebarMenu = () => {
  const [openCage, setOpenCage]     = useState(false);
  const [openRace, setOpenRace]     = useState(false);
  const [openRabbit, setOpenRabbit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openBreeding, setOpenBreeding] = useState(false);
  const history                     = useHistory();
  const location                    = useLocation();

  const handleBack = () => {
    setOpenCage(false);
    setOpenRace(false);
    setOpenRabbit(false);
    setOpenAssign(false);
    setOpenBreeding(false);
    history.push('/');
  };

  const handleBackToBreeding = () => {
    setOpenCage(false);
    setOpenRace(false);
    setOpenRabbit(false);
    setOpenAssign(false);
    setOpenBreeding(true);
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
          <li><Link to="/register-cage" className={location.pathname === '/register-cage' ? 'active' : ''}>Registrar Jaula</Link></li>
          <li><Link to="/edit-cage" className={location.pathname === '/edit-cage' ? 'active' : ''}>Editar Jaula</Link></li>
          <li><Link to="/delete-cage" className={location.pathname === '/delete-cage' ? 'active' : ''}>Eliminar Jaula</Link></li>
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
          <li><Link to="/register-race" className={location.pathname === '/register-race' ? 'active' : ''}>Registrar Raza</Link></li>
          <li><Link to="/edit-race" className={location.pathname === '/edit-race' ? 'active' : ''}>Editar Raza</Link></li>
          <li><Link to="/delete-race" className={location.pathname === '/delete-race' ? 'active' : ''}>Eliminar Raza</Link></li>
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
          <li><Link to="/register-rabbit" className={location.pathname === '/register-rabbit' ? 'active' : ''}>Registrar Conejo</Link></li>
          <li><Link to="/edit-rabbit" className={location.pathname === '/edit-rabbit' ? 'active' : ''}>Editar Conejo</Link></li>
          <li><Link to="/delete-rabbit" className={location.pathname === '/delete-rabbit' ? 'active' : ''}>Eliminar Conejo</Link></li>
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

  
  // Menú Gestionar Crianza
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
        </ul>
      </div>
    );
  }

  // Menú Principal
  return (
    <div className="sidebar-menu" data-testid="sidebar-menu">
      <ul>
        <li>
          <button className={`main-tab ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setOpenBreeding(true)} data-testid="nav-breeding">
            <span className="main-tab-icon">🐰</span>
            Gestionar Crianza
          </button>
        </li>
      </ul>
    </div>
  );
};

export default SidebarMenu;

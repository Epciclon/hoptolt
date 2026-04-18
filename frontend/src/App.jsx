import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { AuthProvider } from './utils/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarMenu from './components/SidebarMenu';
import Home from './pages/Home';
import RegisterCage from './pages/RegisterCage';
import EditCage from './pages/EditCage';
import DeleteCage from './pages/DeleteCage';
import RegisterRace from './pages/RegisterRace';
import EditRace from './pages/EditRace';
import DeleteRace from './pages/DeleteRace';
import RegisterRabbit from './pages/RegisterRabbit';
import EditRabbit from './pages/EditRabbit';
import DeleteRabbit from './pages/DeleteRabbit';
import AssignRabbitCage from './pages/AssignRabbitCage'; 
import MatingRegister from './pages/MatingRegister'; 
import MatingDelete from './pages/MatingDelete'; 
import FeedingControl from './pages/FeedingControl'; 
import VaccinationControl from './pages/VaccinationControl';
import DewormingControl from './pages/DewormingControl';
import GrowthControl from './pages/GrowthControl';
import FeedingReport from './pages/FeedingReport';
import VaccinationReport from './pages/VaccinationReport';
import DewormingReport from './pages/DewormingReport';

// Importar estilos de los nuevos componentes
import './styles/ProtectedRoute.css';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <div className="app-container">
            <div className="main-content">
              <SidebarMenu />
              <div className="content">
                <Switch>
                  <Route exact path="/" component={Home} />
                  <Route path="/register-cage" component={RegisterCage} />
                  <Route path="/edit-cage" component={EditCage} />
                  <Route path="/delete-cage" component={DeleteCage} />
                  <Route path="/register-race" component={RegisterRace} />
                  <Route path="/edit-race" component={EditRace} />
                  <Route path="/delete-race" component={DeleteRace} />
                  <Route path="/register-rabbit" component={RegisterRabbit} />
                  <Route path="/edit-rabbit" component={EditRabbit} />
                  <Route path="/delete-rabbit" component={DeleteRabbit} />
                  <Route path="/assign-rabbit-cage" component={AssignRabbitCage} />
                  <Route path="/mating-register" component={MatingRegister} />  
                  <Route path="/mating-delete" component={MatingDelete} />
                  <Route path="/feeding-control" component={FeedingControl} />
                  <Route path="/vaccination-control" component={VaccinationControl} />
                  <Route path="/deworming-control" component={DewormingControl} />
                  <Route path="/growth-control" component={GrowthControl} />
                  <Route path="/feeding-report" component={FeedingReport} />
                  <Route path="/vaccination-report" component={VaccinationReport} />
                  <Route path="/deworming-report" component={DewormingReport} />      
                </Switch>
              </div>
            </div>
          </div>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  );
};

export default App;
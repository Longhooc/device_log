import React, { useState } from "react";
import logo from './logo.svg';
import './App.scss';
import Nav from "./Nav/Nav";
import View_page from "../pages/View_page";
import DeviceInputForm from "../pages/Form";
import LinkManager from "../pages/LinkManager";
import LinkManagerMobile from "../pages/LinkManagerMobile";
import AICustomerSupport from "../pages/AICustomerSupport";
import HomePage from "../pages/HomePage";
import HomeMobilePage from "../pages/HomeMobilePage";
import SmartphPage from "../pages/SmartphPage";
import BestlabPage from "../pages/BestlabPage";
import SmartphMobilePage from "../pages/SmartphMobilePage";
import BestlabMobilePage from "../pages/BestlabMobilePage";
import { useIsMobile } from "../hooks/useIsMobile";
import DeviceManagement from "../pages/DeviceManagement";
import DeviceManagementMobile from "../pages/DeviceManagementMobile";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../auth/authContext";

import {
  BrowserRouter,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
  const isMobile = useIsMobile();
  return (
    <AuthProvider>
      <div className="App">
        <Nav />
        <Switch>
          <Route path="/home" exact>
            <ProtectedRoute>
              <AICustomerSupport />
            </ProtectedRoute>
          </Route>
          <Route path="/dashboard" exact>
            <ProtectedRoute>
              {isMobile ? <HomeMobilePage /> : <HomePage />}
            </ProtectedRoute>
          </Route>
          <Route path="/link-manager" exact>
            <ProtectedRoute>
              {isMobile ? <LinkManagerMobile /> : <LinkManager />}
            </ProtectedRoute>
          </Route>
          <Route path="/smartph" exact>
            <ProtectedRoute>
              {isMobile ? <SmartphMobilePage /> : <SmartphPage />}
            </ProtectedRoute>
          </Route>
          <Route path="/bestlab" exact>
            <ProtectedRoute>
              {isMobile ? <BestlabMobilePage /> : <BestlabPage />}
            </ProtectedRoute>
          </Route>
          <Route path="/device-management" exact>
            <ProtectedRoute>
              {isMobile ? <DeviceManagementMobile /> : <DeviceManagement />}
            </ProtectedRoute>
          </Route>
          <Route path="/">
            <ProtectedRoute>
              <AICustomerSupport />
            </ProtectedRoute>
          </Route>
        </Switch>
      </div>
    </AuthProvider>
  );
}

export default App;

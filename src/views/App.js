import React, { useState } from "react";
import logo from './logo.svg';
import './App.scss';
import Nav from "./Nav/Nav";
import View_page from "../pages/View_page";
import DeviceInputForm from "../pages/Form";
import LinkManager from "../pages/LinkManager";
import AICustomerSupport from "../pages/AICustomerSupport";
import SmartphPage from "../pages/SmartphPage";
import BestlabPage from "../pages/BestlabPage";
import DeviceManagement from "../pages/DeviceManagement";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../auth/authContext";

import {
  BrowserRouter,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
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
          <Route path="/link-manager" exact>
            <ProtectedRoute>
              <LinkManager />
            </ProtectedRoute>
          </Route>
          <Route path="/smartph" exact>
            <ProtectedRoute>
              <SmartphPage />
            </ProtectedRoute>
          </Route>
          <Route path="/bestlab" exact>
            <ProtectedRoute>
              <BestlabPage />
            </ProtectedRoute>
          </Route>
          <Route path="/device-management" exact>
            <ProtectedRoute>
              <DeviceManagement />
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

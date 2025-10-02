import React, { useState } from "react";
import logo from './logo.svg';
import './App.scss';
import Nav from "./Nav/Nav";
import View_page from "../pages/View_page";
import DeviceInputForm from "../pages/Form";
import LinkManager from "../pages/LinkManager";
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
              <View_page />
            </ProtectedRoute>
          </Route>
          <Route path="/link-manager" exact>
            <ProtectedRoute>
              <LinkManager />
            </ProtectedRoute>
          </Route>
          <Route path="/">
            <ProtectedRoute>
              <DeviceInputForm />
            </ProtectedRoute>
          </Route>
        </Switch>
      </div>
    </AuthProvider>
  );
}

export default App;

import React, { useState } from "react";
import logo from './logo.svg';
import './App.scss';
import Nav from "./Nav/Nav";
import View_page from "../pages/View_page";
import DeviceInputForm from "../pages/Form";
import LinkManager from "../pages/LinkManager";

import {
  BrowserRouter,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Nav />
      <Switch>
        <Route path="/home" exact>
          <View_page />
        </Route>
        <Route path="/link-manager" exact>
          <LinkManager />
        </Route>
        <Route path="/">
          <DeviceInputForm />
        </Route>
      </Switch>
    </div>
  );
}

export default App;

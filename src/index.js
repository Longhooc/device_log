import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './views/App';
import reportWebVitals from './reportWebVitals';
import {
  BrowserRouter,
  Switch,
  Route,
  Link
} from "react-router-dom";

try {
  const test = '__test__';
  window.localStorage.setItem(test, test);
  window.localStorage.removeItem(test);
} catch (e) {
  console.warn('localStorage/sessionStorage is restricted (likely due to iframe/WebView), falling back to in-memory storage');
  
  const createMemoryStorage = () => ({
    _data: {},
    setItem: function(id, val) { this._data[id] = String(val); },
    getItem: function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
    removeItem: function(id) { delete this._data[id]; },
    clear: function() { this._data = {}; }
  });

  Object.defineProperty(window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    enumerable: true,
    writable: true
  });
  
  Object.defineProperty(window, 'sessionStorage', {
    value: createMemoryStorage(),
    configurable: true,
    enumerable: true,
    writable: true
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

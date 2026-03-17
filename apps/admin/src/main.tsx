import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AdminRouter from './router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdminRouter />
  </React.StrictMode>,
);

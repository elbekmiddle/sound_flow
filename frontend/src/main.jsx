import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1a1919', color: '#fff',
            border: '1px solid rgba(72,72,71,0.3)',
            borderRadius: '999px', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', fontWeight: '500',
            padding: '10px 18px',
          },
          success: { iconTheme: { primary: '#4af8e3', secondary: '#0e0e0e' } },
          error:   { iconTheme: { primary: '#ff6e84', secondary: '#0e0e0e' } },
          duration: 2500,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);

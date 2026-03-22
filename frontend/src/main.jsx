import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from './contexts/LangContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import App from './App.jsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <ThemeProvider>
          <App />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: '999px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                padding: '10px 18px',
              },
              success: { iconTheme: { primary: 'var(--color-secondary)', secondary: 'var(--color-background)' } },
              error:   { iconTheme: { primary: 'var(--color-error)',     secondary: 'var(--color-background)' } },
              duration: 2500,
            }}
          />
        </ThemeProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);

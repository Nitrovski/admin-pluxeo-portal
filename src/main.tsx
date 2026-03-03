import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { ToastProvider } from './components/ToastProvider';

const publishableKey = import.meta.env.VITE_ADMIN_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error('Missing VITE_ADMIN_CLERK_PUBLISHABLE_KEY');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>,
);

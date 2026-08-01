import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './application/context/AppContext.tsx';
import { createBrowserPorts } from './composition/createBrowserPorts';

const browserPorts = createBrowserPorts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider ports={browserPorts}>
      <App />
    </AppProvider>
  </StrictMode>
);

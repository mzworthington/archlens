import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './application/context/AppContext.tsx';
import { createBrowserPorts } from './composition/createBrowserPorts';
import { wireBrowserPorts } from './composition/wireBrowserPorts';

const browserPorts = createBrowserPorts();
wireBrowserPorts(browserPorts);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider ports={browserPorts}>
      <App />
    </AppProvider>
  </StrictMode>
);

import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './application/context/AppContext.tsx';
import { createBrowserPorts } from './composition/createBrowserPorts';
import { wireBrowserPorts } from './composition/wireBrowserPorts';
import { ConsoleLoggerAdapter } from './infrastructure/logging/logger';
import { AnalyticsConsentRoot } from './ui/components/AnalyticsConsent/AnalyticsConsentRoot';
import { resolvePostHogConfig } from './infrastructure/analytics/posthogConfig';

const browserPorts = createBrowserPorts();
wireBrowserPorts(browserPorts);

const posthogConfig = resolvePostHogConfig(import.meta.env, {
  onMissingInDev: message => {
    ConsoleLoggerAdapter.error(message);
  },
});
const app: ReactElement = (
  <AppProvider ports={browserPorts}>
    <App />
  </AppProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnalyticsConsentRoot config={posthogConfig}>{app}</AnalyticsConsentRoot>
  </StrictMode>
);

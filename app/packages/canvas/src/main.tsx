import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';
import posthog from 'posthog-js';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './application/context/AppContext.tsx';
import { createBrowserPorts } from './composition/createBrowserPorts';
import { wireBrowserPorts } from './composition/wireBrowserPorts';
import { ConsoleLoggerAdapter } from './infrastructure/logging/logger';
import { initBrowserPostHog } from './infrastructure/analytics/initBrowserPostHog';
import { resolvePostHogConfig } from './infrastructure/analytics/posthogConfig';

const browserPorts = createBrowserPorts();
wireBrowserPorts(browserPorts);

const posthogConfig = resolvePostHogConfig(import.meta.env, {
  onMissingInDev: message => {
    ConsoleLoggerAdapter.error(message);
  },
});
initBrowserPostHog(posthogConfig);

const app: ReactElement = (
  <AppProvider ports={browserPorts}>
    <App />
  </AppProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {posthogConfig.enabled ? <PostHogProvider client={posthog}>{app}</PostHogProvider> : app}
  </StrictMode>
);

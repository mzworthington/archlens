import { lazy, Suspense, useEffect } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { WorkspacePage } from './ui/features/workspace';
import { OfflineBanner } from './ui/components/OfflineBanner/OfflineBanner';
import { UpdateBanner } from './ui/components/UpdateBanner/UpdateBanner';
import { AppNotificationToast } from './ui/components/AppNotificationToast/AppNotificationToast';
import { useApp } from './application/context/AppContext';

const DocsHome = lazy(() => import('./ui/features/docs').then(m => ({ default: m.DocsHome })));
const DocsPage = lazy(() => import('./ui/features/docs').then(m => ({ default: m.DocsPage })));
const JourneysPage = lazy(() =>
  import('./ui/features/docs').then(m => ({ default: m.JourneysPage }))
);
const DesignSystemDocsPage = lazy(() =>
  import('./ui/features/docs').then(m => ({ default: m.DesignSystemDocsPage }))
);
const ForensicsPage = lazy(() =>
  import('./ui/features/forensics').then(m => ({ default: m.ForensicsPage }))
);

/** Vite BASE_URL always has a trailing slash; wouter wants none. */
const routerBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [setLocation, to]);
  return null;
}

function RouteFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-slate-950 text-slate-400 text-sm font-mono">
      Loading…
    </div>
  );
}

function App() {
  const { networkStatus } = useApp();

  return (
    <Router base={routerBase}>
      <UpdateBanner />
      <AppNotificationToast />
      <OfflineBanner networkStatus={networkStatus} />
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/design-system" component={DesignSystemDocsPage} />
          <Route path="/tracelens" component={ForensicsPage} />
          <Route path="/tracelens/*" component={ForensicsPage} />
          <Route path="/forensics">{() => <Redirect to="/tracelens" />}</Route>
          <Route path="/advicelens">
            {() => <Redirect to="/tracelens?view=recommendations" />}
          </Route>
          <Route path="/workspace" component={WorkspacePage} />
          <Route path="/workspace/*" component={WorkspacePage} />
          {/* Legacy GitHub Pages layout: /app → workspace */}
          <Route path="/app">{() => <Redirect to="/workspace" />}</Route>
          <Route path="/app/*">{() => <Redirect to="/workspace" />}</Route>
          <Route path="/guide/forensics">{() => <Redirect to="/guide/tracelens" />}</Route>
          <Route path="/guide/resilience">{() => <Redirect to="/guide/chaoslens" />}</Route>
          <Route path="/guide/design-system">{() => <Redirect to="/design-system" />}</Route>
          <Route path="/guide" component={DocsPage} />
          <Route path="/guide/:page" component={DocsPage} />
          <Route path="/setup" component={DocsPage} />
          <Route path="/chaoslens-engine" component={DocsPage} />
          <Route path="/architecture" component={DocsPage} />
          <Route path="/journeys" component={JourneysPage} />
          <Route path="/features-unit" component={DocsPage} />
          <Route path="/" component={DocsHome} />
          <Route component={DocsPage} />
        </Switch>
      </Suspense>
    </Router>
  );
}

export default App;

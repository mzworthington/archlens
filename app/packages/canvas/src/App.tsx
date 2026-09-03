import { lazy, Suspense } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { WorkspacePage } from './ui/features/workspace';
import { OfflineBanner } from './ui/components/OfflineBanner/OfflineBanner';
import { UpdateBanner } from './ui/components/UpdateBanner/UpdateBanner';
import { AppNotificationToast } from './ui/components/AppNotificationToast/AppNotificationToast';
import { useApp } from './application/context/AppContext';
import { usePageSeo } from './ui/features/docs/seo';

const DocsHome = lazy(() => import('./ui/features/docs').then(m => ({ default: m.DocsHome })));
const DocsPage = lazy(() => import('./ui/features/docs').then(m => ({ default: m.DocsPage })));
const JourneysPage = lazy(() =>
  import('./ui/features/docs').then(m => ({ default: m.JourneysPage }))
);
const DesignSystemDocsPage = lazy(() =>
  import('./ui/features/docs').then(m => ({ default: m.DesignSystemDocsPage }))
);

/** Vite BASE_URL always has a trailing slash; wouter wants none. */
const routerBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function RouteFallback() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-slate-950 text-slate-400 text-sm font-mono">
      Loading…
    </div>
  );
}

function DocumentSeo() {
  const [location] = useLocation();
  usePageSeo(location);
  return null;
}

function App() {
  const { networkStatus } = useApp();

  return (
    <Router base={routerBase}>
      <DocumentSeo />
      <UpdateBanner />
      <AppNotificationToast />
      <OfflineBanner networkStatus={networkStatus} />
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/design-system" component={DesignSystemDocsPage} />
          <Route path="/workspace" component={WorkspacePage} />
          <Route path="/workspace/*" component={WorkspacePage} />
          <Route path="/guide" component={DocsPage} />
          <Route path="/guide/:page" component={DocsPage} />
          <Route path="/setup" component={DocsPage} />
          <Route path="/tech-stack" component={DocsPage} />
          <Route path="/chaoslens-engine" component={DocsPage} />
          <Route path="/architecture" component={DocsPage} />
          <Route path="/privacy" component={DocsPage} />
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

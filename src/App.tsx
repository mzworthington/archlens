import { Route, Switch } from 'wouter';
import { DocsPage } from './pages/DocsPage';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <div>
      <header>
        <nav>
          <a href="/">Home</a>
          {' · '}
          <a href="/docs">Docs</a>
          {' · '}
          <a href="/docs/setup">Setup</a>
        </nav>
      </header>
      <main>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/docs/:slug*" component={DocsPage} />
          <Route path="/docs" component={DocsPage} />
          <Route>Not found</Route>
        </Switch>
      </main>
    </div>
  );
}

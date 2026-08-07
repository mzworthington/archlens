import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRoute } from 'wouter';
import { DOC_PAGES, findDocPage } from '../docs/pages';

export function DocsPage() {
  const [, params] = useRoute('/docs/:slug*');
  const slug = params?.['slug*'];
  const page = findDocPage(slug);

  return (
    <article data-testid="docs">
      <aside>
        <h2>Documentation</h2>
        <ul>
          {DOC_PAGES.filter((entry) => entry.slug !== '').map((entry) => (
            <li key={entry.slug}>
              <a href={`/docs/${entry.slug}`}>{entry.title}</a>
            </li>
          ))}
        </ul>
      </aside>
      <div>
        <h1>{page.title}</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.markdown}</ReactMarkdown>
      </div>
    </article>
  );
}

# Tech stack

| Layer           | Choice                                                           |
| --------------- | ---------------------------------------------------------------- |
| UI              | React 19 + TypeScript                                            |
| Bundler         | Vite 8                                                           |
| Styling         | Tailwind CSS 4 (utilities only; no custom theme in the template) |
| Routing         | wouter                                                           |
| Docs            | Markdown under `docs/`, rendered in-app with `react-markdown`    |
| Package manager | pnpm 11                                                          |
| Toolchain       | Mise                                                             |
| Tests           | Vitest + Testing Library                                         |
| Perf            | Lighthouse CI                                                    |
| Hosting         | Cloudflare Pages (Wrangler deploy)                               |
| IaC             | Pulumi (`infra/cloudflare`)                                      |
| Changelog       | git-cliff + day-bucketed renderer                                |

## Agent / Cloud

Cursor Cloud agents bootstrap via `.cursor/environment.json` → `bin/setup-dev-env.sh`, which installs mise tools and dependencies and optionally clones [agent-lifecycle-kit](https://github.com/mzworthington/agent-lifecycle-kit).

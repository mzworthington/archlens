# Privacy policy

Last updated September 5, 2026.

This page says what ArchLens does with information when you use [ArchLens](https://archlens.dev). It's a plain-language notice, not legal advice.

[Matthew Z Worthington](https://mzworthington.co.uk) builds and hosts ArchLens.

## What stays on your machine

Diagrams you edit in Canvas stay local. Drafts live in the browser, in IndexedDB. Folder workspaces use the File System Access API on your computer. ArchLens doesn't receive a copy of those files unless you publish them yourself, for example through GitHub Actions to a catalog.

Share-link collaboration talks to a Worker at `collab.archlens.dev`. That Worker is for the live session, not a second copy of the whole repository.

## Product analytics

The public site can use [PostHog](https://posthog.com) in the EU, on `Cloud EU`, so ArchLens can see which pages people open, how people use the app, errors, and session replay of the UI.

PostHog doesn't start until you opt in. You can also choose `Don't track me`. This browser stores either choice in `localStorage`, so the page doesn't ask again every visit. You can change it with the control at the top of this page.

If you opt in, PostHog uses a cookie and local storage so PostHog can tell repeat visits apart. ArchLens still doesn't call `identify()`, and doesn't send your name or email. Session replay can still show whatever is on screen in Canvas, so treat diagrams with secrets the way you would a screen share.

If you decline, this browser doesn't load PostHog.

Cloudflare or the browser may still use their own cookies for hosting, security, or the installable app, which is a service worker.

PostHog's own terms and privacy policy apply to data PostHog processes for ArchLens.

## Hosting

The website is static files on Cloudflare Pages. Published sample catalogs live in Cloudflare R2. Those systems receive normal web-request metadata, for example an IP address at the edge, as part of serving the site.

## What ArchLens doesn't do

ArchLens doesn't sell your data. ArchLens doesn't run ads. ArchLens doesn't require an ArchLens account to use Canvas in the browser.

## Asking for a deletion

If you think PostHog or another ArchLens system holds personal data about you, open an issue on [GitHub](https://github.com/mzworthington/archlens/issues) and say what you want removed. ArchLens uses PostHog's deletion tools where they apply.

## Changes

When this notice changes in a material way, the date at the top changes with it.

# Privacy policy

Last updated 5 September 2026.

This page says what ArchLens does with information when you use [archlens.dev](https://archlens.dev). It is a plain-language notice, not legal advice.

ArchLens is built and hosted by [Matthew Z Worthington](https://mzworthington.co.uk).

## What stays on your machine

Diagrams you edit in Canvas are meant to stay local: drafts live in your browser (IndexedDB), and folder workspaces use the File System Access API on your computer. We do not get a copy of those files unless you publish them yourself (for example through GitHub Actions to a catalog).

Share-link collaboration talks to a Worker we host (`collab.archlens.dev`). That is for the live session, not a second copy of your whole repo.

## Product analytics (PostHog)

The public site can use [PostHog](https://posthog.com) **Cloud EU** (servers in the EU) so we can see which pages people open, how the app is used, errors and session replay of the UI.

We do not start PostHog until you opt in. You can also choose **Don't track me**. Either choice is stored in this browser (`localStorage`) so we do not ask again every visit. You can change it with the control at the top of this page.

If you opt in, PostHog uses a **cookie** (and local storage) so repeat visits can be told apart. We still do not call `identify()` and we do not send your name or email. Session replay can still show whatever is on screen in Canvas, so treat diagrams with secrets the way you would a screen share.

If you decline, we do not load PostHog in this browser.

Cloudflare or the browser may still use their own cookies for hosting, security or the installable app (service worker).

PostHog’s own terms and privacy policy apply to data they process for us.

## Hosting

The website is static files on **Cloudflare Pages**. Published sample catalogs live in **Cloudflare R2**. Those systems receive normal web-request metadata (for example IP address at the edge) as part of serving the site.

## What we do not do

We do not sell your data. We do not run ads. We do not require an ArchLens account to use Canvas in the browser.

## Asking us to delete something

If you think we hold personal data about you in PostHog or elsewhere, open an issue on [github.com/mzworthington/archlens](https://github.com/mzworthington/archlens/issues) and say what you want removed. We will use PostHog’s deletion tools where they apply.

## Changes

If this notice changes in a material way, we will update the date at the top.

# Privacy policy

Last updated 3 September 2026.

This page says what ArchLens does with information when you use [archlens.dev](https://archlens.dev). It is a plain-language notice, not legal advice.

ArchLens is built and hosted by [Matthew Z Worthington](https://mzworthington.co.uk).

## What stays on your machine

Diagrams you edit in Canvas are meant to stay local: drafts live in your browser (IndexedDB), and folder workspaces use the File System Access API on your computer. We do not get a copy of those files unless you publish them yourself (for example through GitHub Actions to a catalog).

Share-link collaboration talks to a Worker we host (`collab.archlens.dev`). That is for the live session, not a second copy of your whole repo.

## Product analytics (PostHog)

The public site uses [PostHog](https://posthog.com) **Cloud EU** (servers in the EU) so we can see which pages people open, how the app is used, errors, and session replay of the UI.

We configure PostHog with **cookieless tracking**: it does not write PostHog cookies or use local/session storage for identity, and we do not call `identify()`. Counts use a privacy-preserving hash on PostHog’s servers.

That is why this site does not show a cookie banner for PostHog. Cloudflare or the browser may still use their own cookies for hosting, security, or the installable app (service worker).

We do not use PostHog to store your name or email. Session replay can still show whatever is on screen in Canvas, so treat diagrams with secrets the way you would a screen share.

PostHog’s own terms and privacy policy apply to data they process for us.

## Hosting

The website is static files on **Cloudflare Pages**. Published sample catalogs live in **Cloudflare R2**. Those systems receive normal web-request metadata (for example IP address at the edge) as part of serving the site.

## What we do not do

We do not sell your data. We do not run ads. We do not require an ArchLens account to use Canvas in the browser.

## Asking us to delete something

If you think we hold personal data about you in PostHog or elsewhere, open an issue on [github.com/mzworthington/archlens](https://github.com/mzworthington/archlens/issues) and say what you want removed. We will use PostHog’s deletion tools where they apply.

## Changes

If this notice changes in a material way, we will update the date at the top.

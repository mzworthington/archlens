# Remote catalog refresh (MZW-42)

Surface: banner on a sample workspace that is reading the remote catalog.

| Quality                    | Decision | Why                                                                                                                                                                                                          |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accessibility              | Apply    | The banner names "Newer snapshot available". Refresh in place and Keep what I have are buttons in tab order. When drafts exist, a dialog named Replace draft changes? traps Tab and Escape keeps the drafts. |
| Browser E2E                | Apply    | The remote catalog fixture publishes a second revision. Confirming refresh shows the new diagram without a page reload.                                                                                      |
| Security                   | Skip     | The catalog stays read-only. Refresh does not add a write path or a private bucket.                                                                                                                          |
| Load / performance         | Skip     | One latest-pointer request every 5 seconds while a remote sample workspace is open. No latency SLO.                                                                                                          |
| Editing the remote catalog | Skip     | Out of scope. The canvas still cannot publish back to the bucket.                                                                                                                                            |

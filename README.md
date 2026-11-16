# Arcanum

A free studio for turning comics and stories into visual novels: plan on cards, write, bring in your art, stage scenes and publish a branching story. No accounts, no servers: your projects stay on your own computer.

- **Website and online studio:** https://a-wildheart.github.io/arcanum/
- **Downloads:** on the website, or under Releases on this page.

## What's in this repository

- `docs/` is the website (GitHub Pages serves it): the home page, the online studio (`docs/app/`), the single-file download (`docs/download/Arcanum.html`) and the privacy page.
- `app/index.html` is the whole studio in one file, used by the desktop app.
- `main.js`, `package.json`, `fetch-fonts.js` and `build/icon.png` make the desktop app (Electron).
- `.github/workflows/build.yml` builds the Windows, Mac and Linux installers on GitHub and publishes them as a release.

## Updating to a new version of the studio

Replace these three files with the new `Arcanum.html` (same file, three names):

1. `docs/app/index.html`
2. `docs/download/Arcanum.html`
3. `app/index.html`

Changing `app/index.html` starts a new installer build by itself (Actions tab, about 10 minutes). When it finishes, the website's Download buttons point at the new installers.

## Licence

MIT. See `LICENSE`.

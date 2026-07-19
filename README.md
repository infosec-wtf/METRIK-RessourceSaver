# Metrik Ressource Saver

Chrome MV3 **DevTools extension** that downloads every resource of the inspected
page in one click, keeping the original folder structure, and saves it as a ZIP.

> Fork of [up209d/ResourcesSaverExt](https://github.com/up209d/ResourcesSaverExt),
> modernized and security-hardened. Licensed under GPL-3.0 (see `LICENSE`).

## How to use

1. Build the extension (see below) — output goes to `unpacked2x/`.
2. Chrome → `Extensions` → enable **Developer mode** → **Load unpacked** →
   select the `unpacked2x/` directory.
3. Open **DevTools** on any page → **Metrik Ressource Saver** tab → **Save all resources**.
4. The saved site mirrors the remote folder structure; serve it again with any
   static server (e.g. [http-server](https://github.com/http-party/http-server)).

## Development

Requirements: Node (see `.nvmrc`, currently 22) and Yarn (via `corepack enable`).

```bash
corepack enable        # provides yarn
yarn install           # install dependencies
yarn build             # production build -> unpacked2x/
yarn dev               # watch build for development
yarn test              # run unit tests (node:test)
```

Build output (`unpacked2x/`, `dist/`) and local/planning files are gitignored and
must not be committed.

## Security & architecture notes

This fork removed the legacy 0.1.x panels and the in-page "beautify" feature and
hardened the resource-handling code:

- **No legacy panels / version switcher** — the modern React panel is always
  loaded. This removed a DOM-XSS sink that ran in the privileged extension origin.
- **Path-traversal / Zip-Slip safe** — resource URLs are decoded first, then the
  save path is rebuilt segment-by-segment, dropping `.`/`..`
  (`src/devtoolApp/utils/url.js`, covered by tests).
- **Retry-fetch hardened** — the automatic content re-fetch is restricted to
  public http(s) hosts (private/loopback/link-local blocked) and uses
  `credentials: 'omit'` (`src/devtoolApp/utils/security.js`).
- **Minimal permissions** — only `tabs`; explicit `content_security_policy`.
- **No `prettier` in the client bundle** — the beautify feature was removed,
  shrinking the panel bundle substantially and removing a main-thread DoS vector.

Tests: `yarn test` (runs `node --test 'src/**/*.test.mjs'`).

## Credits

This project is a fork of **[ResourcesSaverExt](https://github.com/up209d/ResourcesSaverExt)**
by **[up209d](https://github.com/up209d)**, the original author of the program.
All credit for the original tool goes to them.

If you find it useful, please support the original author:

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/up209d)

☕ https://www.buymeacoffee.com/up209d

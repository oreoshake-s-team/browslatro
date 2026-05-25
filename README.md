# Browslatro

A slimmed-down React + TypeScript implementation of the popular poker game, Balatro. Built with [Vite](https://vitejs.dev/), [Vitest](https://vitest.dev/), and [Playwright](https://playwright.dev/).

## Package manager

This project uses [Yarn 4 (Berry)](https://yarnpkg.com/) (pinned via the `packageManager` field in `package.json`) with the Plug'n'Play (PnP) linker.

Activate the pinned version through Corepack, then install:

```sh
corepack enable
yarn install
```

Corepack ships with Node.js and reads `packageManager` from `package.json` to pick the right Yarn version automatically — the release binary is committed to `.yarn/releases/`, so no network call is needed to bootstrap Yarn itself.

### Worktrees

PnP keeps dependencies in a shared `.yarn/` cache and resolves modules through `.pnp.cjs`, so worktrees do not need their own `node_modules/`:

```sh
git worktree add ../some-branch some-branch
cd ../some-branch
yarn install   # near-instant under PnP
```

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in development mode at [http://localhost:3000](http://localhost:3000) with Vite's HMR.

### `yarn test`

Runs the Vitest unit test suite once. Use `yarn test:watch` for the interactive watch mode.

### `yarn build`

Type-checks with `tsc` and produces an optimized production bundle in `build/`.

### `yarn preview`

Serves the production build locally for smoke-testing the bundle.

### `yarn e2e`

Builds the app, boots `vite preview`, and runs the Playwright end-to-end suite against it.

### `yarn typecheck`

Runs `tsc --noEmit` without building.

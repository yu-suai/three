# @yusuai/three

A three.js based digital twin visualization toolkit.

## Develop

```bash
npm install
npm run build
```

`npm run build` will generate npm publish files into `dist/`.

## Usage

```js
import { DTViewer } from '@yusuai/three'

const viewer = new DTViewer({
  container: document.getElementById('app'),
  prefixAsset: '/assets'
})

viewer.startup()
```

## Public entry

This package exposes a single public entry:

```js
import { DTViewer } from '@yusuai/three'
```

Sub-path imports are intentionally not exposed.

## Publish check

```bash
npm run build
npm run pack:check
```

The npm package is limited by the `files` field in `package.json`:

```txt
dist/
README.md
LICENSE
```

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

## Patrol

```js
import { PatrolController, OBJRouteParser } from '@yusuai/three'

const points = OBJRouteParser.parsePoints(objText, {
  center: true,
  scale: 0.72,
  y: 0.32,
})

const patrol = new PatrolController(viewer, {
  points,
  actor: robotObject,
  speed: 6,
  devices,
  detector: {
    width: 12,
    height: 8,
    depth: 18,
  },
})

patrol.on('progress', state => {
  console.log(state.progressPercent)
})

patrol.on('deviceHit', event => {
  console.log(event.device, event.action)
})

patrol.start()
```

Common controls:

```js
patrol.pause()
patrol.resume()
patrol.reset()
patrol.setSpeed(8)
patrol.seekByPercent(0.5)
patrol.setRange({ depth: 30, width: 16, height: 10 })
patrol.update(deltaSeconds)
```

## Public entry

This package exposes a single public entry:

```js
import { DTViewer, PatrolController } from '@yusuai/three'
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


import { DTViewer } from "./DigitalTwinViewer"

let container = document.createElement('div')
container.style.position = 'fixed'
container.style.width = '100vw'
container.style.height = '100vh'
document.body.appendChild(container)

let sv = new DTViewer({
	container,
	// prefixAsset
})

sv.startup()


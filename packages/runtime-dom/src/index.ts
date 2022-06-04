import { createRenderer } from '@vue/runtime-core'
import { nodeOpts } from './nodeOpts'

import { patchProp } from './patchProp'

const renderOptions = Object.assign(nodeOpts, {
  patchProp
})


export function render(vnode, container) {
  return createRenderer(renderOptions).render(vnode, container)
}

export * from '@vue/runtime-core'
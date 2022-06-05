import { reactive } from "@vue/reactivity"
import { hasOwn } from "@vue/shared"

export function initProps(instance, rawProps) {
  const props = {}
  const attrs = {}


  const options = instance.propsOptions || {}

  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (hasOwn(value, key)) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }

  // 这里应该使用shallowReactive
  instance.props = reactive(props)
  instance.attrs = attrs
}

export function updateProps(instance, prevProps, nextProps) {
}
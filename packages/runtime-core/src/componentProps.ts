import { reactive } from "@vue/reactivity"
import { hasOwn } from "@vue/shared"

export function initProps(instance, rawProps) {
  const props = {}
  const attrs = {}


  const options = instance.propsOptions || {}

  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (hasOwn(options, key)) {
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

// 比对前后属性是否发生变化
const hasPropsChange = (prevProps = {}, nextProps = {}) => {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }

  for (let i = 0;i < nextKeys.length;i++) {
    const key = nextKeys[i]
    if (nextKeys[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}

export function updateProps(instance, prevProps, nextProps) {


  if (hasPropsChange(prevProps, nextProps)) {

    // 更新props
    for (const key in nextProps) {
      instance.props[key] = nextProps[key]
    }

    // 以前有 现在没有的属性 删除
    for (const key in instance.props) {
      if (!hasOwn(nextProps, key)) {
        delete instance.props[key]
      }
    }
  }
}
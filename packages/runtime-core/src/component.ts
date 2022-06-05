import { reactive } from "@vue/reactivity"
import { hasOwn, isFunction } from "@vue/shared"
import { initProps } from "./componentProps"

export function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode,
    subTree: null, // 组件渲染的内容
    isMounted: false,
    update: null,
    propsOptions: vnode.type.props,
    props: {},
    attrs: {},
    proxy: null
  }


  return instance
}

const publicPropertyMap = {
  $attrs: i => i.attrs
}

const publicInstanceProxy = {
  get(target, key) {
    const { state, props } = target
    if (state && hasOwn(state, key)) {
      return state[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    }

    // this.$attrs
    let getter = publicPropertyMap[key]
    if (getter) {
      return getter(target)[key]
    }
  },
  set(target, key, value) {
    const { data, props } = target
    if (data && hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (props && hasOwn(props, key)) {
      console.warn('不能修改props: ' + (key as string))
      return false
    }
    return true
  }
}
export function setupComponent(instance) {
  const { props, type } = instance.vnode
  initProps(instance, props)
  instance.proxy = new Proxy(instance, publicInstanceProxy)

  let data = type.data
  if (data) {
    if (!isFunction(data)) {
      return console.warn('data必须是函数')
    }
    instance.data = reactive(data.call(instance.proxy))
  }


  instance.render = type.render
}
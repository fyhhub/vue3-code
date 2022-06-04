import { isObject } from "@vue/shared";
import { mutableHandler } from "./baseHandler";

const reactiveMap = new WeakMap()

export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE])
}
export function reactive(target) {
  if (!isObject(target)) {
    return
  }
  // 已经被代理过
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  const existingProxy = reactiveMap.get(target)
  if (existingProxy) return existingProxy

  const proxy = new Proxy(target, mutableHandler)
  reactiveMap.set(target, proxy)
  return proxy
}
import { isObject } from "@vue/shared"
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags } from "./reactive"

export const mutableHandler = {
  // receiver 实际是proxy对象 , 如果get里面又嵌套了一个属性，只会触发一个get,所以需要Reflect
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    track(target, 'get', key)
    const res = Reflect.get(target, key, receiver)
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  },
  set(target, key, val, receiver) {
    let oldValue = target[key]
    let result = Reflect.set(target, key, val, receiver)
    if (oldValue !== val) {
      trigger(target, 'set', key, val, oldValue)
    }
    return result
  }
}
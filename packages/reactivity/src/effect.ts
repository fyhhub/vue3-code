
export let activeEffect = undefined


function cleanupEffect(effect) {
  const { deps } = effect
  for (let i = 0;i < deps.length;i++) {
    deps[i].delete(effect) // 接触当前effect
  }
  effect.deps.length = 0
}

export class ReactiveEffect {
  public active = true
  public parent = null
  public deps = []
  constructor(public fn, public scheduler?) {}

  run() {
    // 非激活情况，只需要执行函数 不需要收集依赖
    if (!this.active) {
      return this.fn()
    }


    try {
      this.parent = activeEffect
      activeEffect = this

      // 解决分支切换问题
      cleanupEffect(this)
      return this.fn()
    } finally {
      activeEffect = this.parent
      this.parent = null
    }
  }

  // 停止收集effect
  stop() {
    if (this.active) {
      this.active = false
      cleanupEffect(this)
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler)


  // 默认先执行
  _effect.run()

  const runner = _effect.run.bind(_effect)

  runner.effect = _effect
  return runner
}

const targetMap = new WeakMap()

export function trackEffects(dep) {
  if (activeEffect) {
    let shouldTrack = !dep.has(activeEffect)

    if (shouldTrack) {
      // 属性记录 effect
      dep.add(activeEffect)
      // effect 反向记录所有属性的dep Set集合，这么做是为了处理分支切换 例如 flag ? this.name : this.age, 切换前 需要把所有属性的dep Set中的当前effect去除
      activeEffect.deps.push(dep)
    }
  }
}
// 一个effect对应多个属性，一个属性对应多个effect
export function track(target, type, key) {
  if (!activeEffect) return

  let depMap = targetMap.get(target)
  if (!depMap) {
    targetMap.set(target, (depMap = new Map()))
  }

  let dep = depMap.get(key)
  if (!dep) {
    depMap.set(key, (dep = new Set()))
  }

  trackEffects(dep)
}

export function triggerEffects(effects) {
  // 为了处理死循环，遍历Set的时候 清除依赖  又添加依赖  会导致死循环
  effects = new Set(effects)
  effects.forEach(effect => {
    // 处理 在effect中又执行set操作的情况
    if (effect !== activeEffect) {
      if (effect.scheduler){
        effect.scheduler()
      } else {
        effect.run()
      }
    }
  })
}

export function trigger(target, type, key, value, oldValue) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  let effects = depsMap.get(key)
  if (effects) {
    triggerEffects(effects)
  }
}
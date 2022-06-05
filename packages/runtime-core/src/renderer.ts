import { reactive } from "@vue/reactivity";
import { hasOwn, isString, ShapeFlags } from "@vue/shared";
import { ReactiveEffect } from "packages/reactivity/src/effect";
import { createComponentInstance, setupComponent } from "./component";
import { initProps, updateProps } from "./componentProps";
import { queueJob } from "./scheduler";
import { createVNode, Fragment, isSameVNode, Text } from './vnode'
export function createRenderer(renderOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = () => {},
    cloneNode: hostCloneNode,
    insertStaticContent: hostInsertStaticContent
  } = renderOptions

  const normalize = (children, i) => {
    if (isString(children[i]) || typeof children[i] === 'number') {
      const vnode = createVNode(Text, null, children[i])
      children[i] = vnode
    }
    return children[i]
  }
  const mountChildren = (children, container) => {
    for (let i = 0;i < children.length;i++) {
      let child = normalize(children, i)
      patch(null, child, container)
    }
  }

  const mountElement = (vnode, container, anchor?) => {
    const { type, props, children, shapeFlag } = vnode

    // 创建dom
    let el = vnode.el = hostCreateElement(type)

    // 创建属性
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 创建孩子
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }

    // 挂载到容器
    hostInsert(el, container, anchor)
  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    } else {
      // 文本内容变化，复用老节点
      const el = n2.el = n1.el
      // 更新文本
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  const patchProps = (oldProps, newProps, el) => {
    // 新的属性直接覆盖或新增
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }

    // 老的有 新的没有  删除老的属性
    for (const key in oldProps) {
      if (newProps[key] == null) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  const unmountChildren = (children) => {
    for (let i = 0;i < children.length;i++) {
      unmount(children[i])
    }
  }

  function getSequence(arr: number[]): number[] {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
      const arrI = arr[i]
      if (arrI !== 0) {
        j = result[result.length - 1]
        if (arr[j] < arrI) {
          p[i] = j
          result.push(i)
          continue
        }
        u = 0
        v = result.length - 1
        while (u < v) {
          c = (u + v) >> 1
          if (arr[result[c]] < arrI) {
            u = c + 1
          } else {
            v = c
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
  }


  // 比较新老儿子
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    //    e1 e2
    //     | |
    // a b c |
    // a b d e
    //     |
    //     i
    // 从头部开始 跳过相同节点
    while(i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }

    // i e1
    // | |
    // a b c d e
    //   f c d e
    //   |
    //   e2
    // 从尾部开始 跳过相同节点
    while(i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVNode(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }


    // i > e1 说明前面或后面有新增的
    // i 和 e2之间是新增部分

    //   e1
    //   |
    // a b
    // a b c d
    //     | |
    //     i e2
    // 或

    // e1(-1)
    // b c
    // a b c
    // |
    // e2、i
    if (i > e1) {
      if (i <= e2) {
        while(i <= e2) {
          const nextPos = e2 + 1
          // 根据下一个索引判断是append还是insert
          // 如果e2下一个是空，说明是后面新增，如果e2下一个存在，说明是前面新增
          const anchor = nextPos < c2.length ? c2[nextPos].el : null
          // 创建新节点 扔到容器
          patch(null, c2[i], el, anchor)
          i++
        }
      }

    // i > e2 说明前后有删除节点
    // i 到 e1 是删除部分

    //     e1
    //     |
    // a b c
    // a b
    //   | |
    //  e2 i

    // 或

    //   i e1
    //   | |
    //   a d b c
    //   b c
    // e2(-1)
    } else if (i > e2) {
      if (i <= e1) {
        while(i <= e1) {
          unmount(c1[i])
          i++
        }
      }
    }


    // 未知序列对比
    // [a b] c d e [f g]
    // [a b] e c d h [f g]

    let s1 = i
    let s2 = i
    // 建立新儿子的映射表
    const keyToNewIndexMap = new Map()
    for (let i = s2;i <= e2;i++) {
      keyToNewIndexMap.set(c2[i].key, i)
    }

    // 上述案例中 e c d h 部分节点数量
    const toBePatched = e2 - s2 + 1
    // 新的位置 => 老位置
    const newIndexToOldIndex = new Array(toBePatched).fill(0)

    // 循环老儿子
    for (let i = s1;i <= e1;i++) {
      const oldChild = c1[i]
      const newIndex = keyToNewIndexMap.get(oldChild.key)
      // 老儿子在新儿子中不存在 说明删除了
      if (newIndex == null) {
        unmount(oldChild)
      } else {
        // 新的位置 => 老位置
        // i + 1的目的：如果i > 0说明被patch过，新增节点默认为0
        newIndexToOldIndex[newIndex - s2] = i + 1
        // 递归对比
        patch(oldChild, c2[newIndex], el)
      }
    }

    // 需要移动位置
    // [a b] e c d h [f g]
    // 从后往前遍历 e c d h
    const increment = getSequence(newIndexToOldIndex)
    let j = increment.length - 1
    for (let i = toBePatched - 1;i >= 0;i--) {
      // 获取 h
      let index = i + s2
      let current = c2[index]
      // 如果当前是h节点 [a b] e c d h [f g] 判断 h后面是否有值，如果有就用 f 作为参照节点
      let anchor = index + 1 < c2.length ? c2[index + 1].el : null
      // 创建
      if (newIndexToOldIndex[i] === 0) {
        patch(null, current, el, anchor)
      } else {
        if (i !== increment[j]) {
          // 移动老dom
          hostInsert(current.el, el, anchor)
        } else {
          j--
        }
      }
    }
  }

  const patchChildren = (n1, n2, el) => {
    // 比较两个vnode的子节点区别
    const c1 = n1 && n1.children
    const c2 = n2 && n2.children
    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag
    // 比较两个孩子的差异

    // 1. 新儿子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 1.1 数组 => 文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 删除老儿子
        unmountChildren(c1)
      }
      // 1.2 文本 => 文本
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }

    // 2. 新儿子是数组或空
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 2.1 数组 => 数组 diff算法(全量更新)
          patchKeyedChildren(c1, c2, el)
        } else {
          // 2.2 数组 => 空
          unmountChildren(c1)
        }
      } else {
        // 2.3 文本 => 空
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        // 2.4 文本 => 数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el)
        }
      }
    }
  }

  const patchElement = (n1, n2, container) => {
    const el = n2.el = n1.el
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // 对比属性
    patchProps(oldProps, newProps, el)

    // 对比孩子
    patchChildren(n1, n2, el)
  }

  const processElement = (n1, n2, container, anchor) => {
    if (!n1) {
      mountElement(n2, container, anchor)
    } else {
      // 更新
      patchElement(n1, n2, container)
    }
  }

  // 如果是Fragment直接拿子节点挂载或对比
  const processFragment = (n1, n2, container) => {
    if (n1 == null) {
      mountChildren(n2.children, container)
    } else {
      patchChildren(n1, n2, container)
    }
  }



  const mountComponent = (vnode, container, anchor) => {

    // 创建组件实例
    const instance = vnode.component = createComponentInstance(vnode)

    // 设置组件数据 并代理数据
    setupComponent(instance)

    setupRenderEffect(instance, container, anchor)
  }

  const setupRenderEffect = (instance, container, anchor) => {
    const { render } = instance
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const subTree = render.call(instance.proxy)
        patch(null, subTree, container, anchor)
        instance.subTree = subTree
        instance.isMounted = true
      } else {
        const subTree = render.call(instance.proxy)
        patch(instance.subTree, subTree, container, anchor)
      }
    }

    // 组件异步更新
    const effect = new ReactiveEffect(componentUpdateFn, () => {
      return queueJob(instance.update)
    })

    const update = instance.update = effect.run.bind(effect)
    update()
  }

  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component
    const { props: prevProps } = n1
    const { props: nextProps } = n2
    updateProps(instance, prevProps, nextProps)
  }


  const processComponent = (n1, n2, container, anchor) => {
    if (!n1) {
      mountComponent(n2, container, anchor)
    } else {
      updateComponent(n1, n2)
    }
  }

  const patch = (n1, n2, container, anchor?) => {
    if (n1 === n2) return

    // 节点类型不一样
    if (n1 && !isSameVNode(n1, n2)) {
      // 删除旧节点
      unmount(n1)
      n1 = null
    }
    const {type, shapeFlag} = n2
    switch(type) {
      case Text:
        processText(n1, n2, container)
        break;
      case Fragment:
        processFragment(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor)
        }
    }
  }

  const unmount = (vnode) => {
    hostRemove(vnode.el)
  }

  const render = (vnode, container) => {
    if (vnode == null) {
      // 卸载
      container._vnode && unmount(container._vnode)
    } else {
      patch(container._vnode || null, vnode, container)
    }

    container._vnode = vnode
  }
  return {
    render
  }
}
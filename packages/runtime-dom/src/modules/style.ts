export function patchStyle(el, preValue, nextValue) {
  for (const key in nextValue) {
    el.style[key] = nextValue[key]
  }

  if (preValue) {
    for (const key in preValue) {
      if (nextValue[key] == null) {
        el.style[key] = null
      }
    }
  }
}
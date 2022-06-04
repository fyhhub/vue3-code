export const isObject = (value: unknown) => {
  return typeof value === 'object' && value !== null
}

export const isFunction = (value: unknown) => {
  return typeof value === 'function'
}

export const isArray = (value: unknown) => {
  return Array.isArray(value)
}

export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export * from './shapeFlags'
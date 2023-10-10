export const extend = Object.assign

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string => objectToString.call(value)

export const toRawType = (value: unknown): string => {
    return toTypeString(value).slice(8, -1)
}

const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (
    val: object,
    key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key)

export const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal)
}

export const isObject = (val) => val !== null && typeof val === 'object'

export const isArray = (val) => Array.isArray(val)

export const isString = (val) => typeof val === 'string'

export const isFunction = (val) => typeof val === 'function'

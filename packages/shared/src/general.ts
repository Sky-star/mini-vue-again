export const extend = Object.assign

export const objectToString = Object.prototype.toString
export const toTypeString = (value: unknown): string => objectToString.call(value)

export const toRawType = (value: unknown): string => {
    return toTypeString(value).slice(8, -1)
}

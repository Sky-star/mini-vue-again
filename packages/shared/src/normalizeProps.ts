export function normalizeClass(value) {
    const type = typeof value
    let res = ""
    if (type === "string") {
        res = value
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const normalized = normalizeClass(value[i])
            if (normalized) {
                res += normalized + " "
            }
        }
    } else if (type === "object") {
        for (const name in value) {
            if (value[name]) {
                res += name + " "
            }
        }
    }

    return res.trim()
}
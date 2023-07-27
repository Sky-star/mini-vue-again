const get = createGetter()

function createGetter() {
    return function get(target, key, receiver) {
        if (key === 'size') {
            return Reflect.get(target, key, target)
        }

        return target[key].bind(target)
    }
}

export const collectionHandlers = {
    get,
}

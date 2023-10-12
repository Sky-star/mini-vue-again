import { ref } from "../../reactivity/src"

// defineAsyncComponent 函数用于定义个异步组件， 接收一个异步组件加载作为参数
export function defineAsyncComponent(options) {
    if (typeof options === 'function') {
        options = {
            loader: options
        }
    }

    const { loader } = options

    let InnerComp = null

    return {
        name: 'AsyncComponentWrapper',
        setup() {
            const loaded = ref(false)
            const error = ref(null)
            // 一个标志， 代表是否正在加载， 默认为 false
            const loading = ref(false)

            let loadingTimer: any = null
            // 如果配置项中存才 delay， 则开启一个定时器计时，当延迟到后将 loading.value 设置为 true
            if (options.delay) {
                loadingTimer = setTimeout(() => {
                    loading.value = true
                }, options.delay)
            } else {
                // 如果配置项中没有 delay， 则直接标记为加载中
                loading.value = true
            }

            loader()
                .then(c => {
                    InnerComp = c
                    loaded.value = true
                })
                .catch((err) => error.value = err)
                .finally(() => {
                    loading.value = false
                    // 加载完毕后，无论成功与否都要清除延迟定时器
                    clearTimeout(loadingTimer)
                })

            let timer: any = null
            if (options.timeout) {
                timer = setTimeout(() => {
                    const err = new Error(`Async component time out after ${options.timeout}ms.`)
                    error.value = err
                }, options.timeout)
            }

            const placeholder = { type: Text, children: '' }

            return () => {
                if (loading.value) {
                    return { type: InnerComp }
                } else if (error.value && options.errorComponent) {
                    return { type: options.errorComponent, props: { error: error.value } }
                } else if (loading.value && options.loadingComponent) {
                    // 如果异步组件正在加载，并且用户指定了 Loading 组件，则渲染 Loading 组件
                    return { type: options.loadingComponent }
                } else {
                    return placeholder
                }
            }
        }
    }
}

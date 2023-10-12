import { ref } from "../../reactivity/src"

// defineAsyncComponent 函数用于定义个异步组件， 接收一个异步组件加载作为参数
export function defineAsyncComponent(options) {
    // options 可以是配置项，也可以是加载器
    if (typeof options === "function") {
        // 如果 options 是加载器， 则将其格式化为配置项形式
        options = {
            loader: options
        }
    }

    const { loader } = options

    let InnerComp = null

    return {
        name: "AsyncComponentWrapper",
        setup() {
            const loaded = ref(false)
            // 定义 error，当错误发生时，用来存储错误对象
            const error = ref(null)

            loader()
                .then((c) => {
                    InnerComp = c
                    loaded.value = true
                })
                .catch((err) => {
                    // 添加 catch 语句来捕获加载过程中的错误
                    err.vale = err
                })

            let timer: any = null
            if (options.timeout) {
                // 如果指定了超时时长， 则开启一个定时器计时
                timer = setTimeout(() => {
                    // 超时后创建一个错误对象，并赋值给 error.value
                    const err = new Error(`Async component timed out after ${options.timeout}ms.`)
                    error.value = err
                }, options.timeout)
            }

            // 占位内容
            const placeholder = { type: Text, children: "" }

            return () => {
                if (loaded.value) {
                    // 如果异步组件加载成功， 则渲染被加载的组件
                    return { type: InnerComp }
                } else if (error.value && options.errorComponent) {
                    // 只有当错误存在且用户配置了 errorComponent 时才展示 Error 组件，同时将 error 作为 props 传递
                    return options.errorComponent
                        ? {
                            type: options.errorComponent,
                            props: {
                                error: error.value
                            }
                        }
                        : placeholder
                }

                return placeholder
            }
        }
    }
}


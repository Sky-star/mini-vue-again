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
            // 代表是否超时，默认为 false， 即没有超时
            const timeout = ref(false)

            loader().then((c) => {
                InnerComp = c
                loaded.value = true
            })

            let timer: any = null
            if (options.timeout) {
                // 如果指定了超时时长， 则开启一个定时器计时
                timer = setTimeout(() => {
                    // 超时后将 timeout 设置为 true
                    timeout.value = true
                }, options.timeout)
            }

            // 占位内容
            const placeholder = { type: Text, children: "" }

            return () => {
                if (loaded.value) {
                    // 如果异步组件加载成功， 则渲染被加载的组件
                    return { type: InnerComp }
                } else if (timeout.value) {
                    // 如果加载超时了， 并且用户指定了 Error 组件， 则渲染该组件
                    return options.errorComponent ? { type: options.errorComponent } : placeholder
                }

                return placeholder
            }
        }
    }

}

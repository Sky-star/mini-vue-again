import { ref } from "../../reactivity/src"

// defineAsyncComponent 函数用于定义个异步组件， 接收一个异步组件加载作为参数
export function defineAsyncComponent(loader) {
    // 一个变量，用来存储异步加载组件
    let InnerComp = null
    // 返回一个包装组件
    return {
        name: "AsyncComponentWrapper",
        setup() {
            // 异步组件是否加载成功
            const loaded = ref(false)
            // 还行加载器函数， 返回一个 Promise 实例
            // 加载成功后，将加载成功的组件赋值给 InnerComp,并将 loaded 标记为 true， 代表加载成功
            loader().then((c) => {
                InnerComp = c
                loaded.value = true
            })

            return () => {
                // 如果异步组件加载成功，则渲染该组件，否则渲染一个占位内容
                return loaded.value ? { type: InnerComp } : { type: Text, children: "" }
            }
        }
    }
}

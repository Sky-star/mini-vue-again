
export function createRenderer(options) {
    // 通过 options 配置项将目标平台的特有API抽离出去
    const {
        createElement,
        insert,
        remove,
        setElementText,
        patchProps,
    } = options

    // 具体的渲染动作
    function render(vnode, container) {
        if (vnode) {
            // 新 vnode 存在， 将其与旧 vnode 一起传递给 patch 函数， 进行打补丁
            patch(container._vnode, vnode, container)
        } else {
            if (container._vnode) {
                // 旧 vnode 存在， 且新 vnode 不能存在， 说明是卸载 (unmount) 操作
                // 只需要将 container 内的 DOM 清理即可
                unmount(container._vnode)
            }
        }

        // 把 vnode 存储到 container._vnode 下， 就是后续渲染中的旧 vnode
        container._vnode = vnode
    }

    // 卸载函数
    function unmount(vnode) {
        // 方便在内部调用相关的钩子函数
        remove(vnode.el)
    }

    // 承担着具体的渲染逻辑
    function patch(n1, n2, container) {
        // 如果 n1 存在， 则对比 n1 和 n2 的类型
        if (n1 && n1.type !== n2.type) {
            // 如果新旧 vnode 的类型不同，则直接将旧 vnode 卸载
            unmount(n1)
            n1 = null
        }

        // 代码运行到这里， 证明 n1 和 n2 所描述的内容相同
        const { type } = n2
        // 如果 n2.type 的值时字符串类型， 则它描述的是普通标签元素
        if (typeof type === 'string') {
            // 如果 n1 不存在，意味着挂载， 则调用 mountElement 函数完成挂载
            if (!n1) {
                mountElement(n2, container)
            } else {
                // n1 存在，意味着打补丁，暂时省略
                patchElement(n1, n2)
            }
        } else if (typeof type === 'object') {
            // 如果 n2.type 的值类型是对象，则它描述的是组件
        } else if (type === 'xxx') {
            // 处理其他类型的 vnode
        }
    }

    function patchElement(n1: any, n2: any) {
        // Implement
    }

    function mountElement(vnode: any, container: any) {
        // 调用 createElement 函数创建元素
        const el = createElement(vnode.type)

        // 如果 children 是文字类型的值，则代表需要设置元素的文字节点
        if (typeof vnode.children === 'string') {
            setElementText(el, vnode.children)
        } else if (Array.isArray(vnode.children)) {
            // 如果 children 是数组，则遍历每一个子节点，并调用 patch 函数挂载他们
            vnode.children.forEach(child => {
                patch(null, child, el)
            });
        }

        // 如果 vnode.props 存在才处理它, 即设置节点的各种属性，类似 id, class
        if (vnode.props) {
            // 遍历 vnode.props
            for (const key in vnode.props) {
                // 直接设置属性
                patchProps(el, null, vnode.props[key])
            }
        }

        // 调用 insert 函数将元素插入到容器内
        insert(el, container)
    }

    return {
        render
    }
}



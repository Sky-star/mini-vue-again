import { isArray, toRawType } from '../../shared/src/general';
import { Fragment } from './vnode';

export function createRenderer(options) {
    // 通过 options 配置项将目标平台的特有API抽离出去
    const {
        createElement,
        insert,
        remove,
        setElementText,
        patchProps,
        createText,
        setText,
        createComment,
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
        // 在卸载时， 如果卸载的 vnode 类型为 Fragment，则需要卸载其 children
        if (vnode.type === Fragment) {
            vnode.children.forEach((c) => unmount(c))
            return
        }
        // 方便在内部调用相关的钩子函数
        remove(vnode.el)
    }

    // 承担着具体的渲染逻辑
    function patch(n1, n2, container, anchor = null) {
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
                mountElement(n2, container, anchor)
            } else {
                // n1 存在，意味着打补丁
                patchElement(n1, n2)
            }
        } else if (type === Text) {
            // 如果新 vnode 的类型是 Text, 则说明该 vnode  描述的是文本节点

            // 如果没有旧节点， 则进行挂载
            if (!n1) {
                // 使用 createTextNode 创建文本节点
                const el = n2.el = createText(n2.children)
                // 将文件节点插入到容器中
                insert(el, container)
            } else {
                // 如果旧 vnode 存在， 只需要使用新文本节点的文本内容更新旧文本节点即可
                const el = n2.el = n1.el
                if (n2.children !== n1.children) {
                    setText(el, n2.children)
                }
            }
        } else if (type === Comment) {
            // 如果新 vnode 的类型是 Comment, 则说明该 vnode  描述的是注释节点

            // 如果没有旧节点， 则进行挂载
            if (!n1) {
                // 使用 createTextNode 创建文本节点
                const el = n2.el = createComment(n2.children)
                // 将文件节点插入到容器中
                insert(el, container)
            } else {
                // 注释节点是不支持修改注释文字的
                n2.el = n1.el
            }

        } else if (type == Fragment) {
            // 处理 Fragment 类型的 vnode
            if (!n1) {
                // 如果旧 vnode 不存在，则只需要将 Fragment 的 children 逐个挂载即可
                n2.children.forEach(c => patch(null, c, container))
            } else {
                // 如果旧 vnode 存在，则只需要更新 Fragment 的 children 即可
                patchChildren(n1, n2, container)
            }
        } else if (typeof type === 'object') {
            // 如果 n2.type 的值类型是对象，则它描述的是组件
        } else if (type === 'xxx') {
            // 处理其他类型的 vnode
        }
    }

    function patchElement(n1: any, n2: any) {
        const el = n2.el = n1.el
        const oldProps = n1.props
        const newProps = n2.props
        // 第一步： 更新 Props
        for (const key in newProps) {
            if (newProps[key] !== oldProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key])
            }
        }

        // 清空不存在的旧值
        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, oldProps[key], null)
            }
        }

        // 第二步: 更新 children
        patchChildren(n1, n2, el)
    }

    // 更新子节点
    function patchChildren(n1, n2, container) {
        // 判断子节点的类型是否是文本节点
        if (typeof n2.children === 'string') {
            // 旧子节点中有三种可能: 没有子节点、文本子节点以及一组子节点
            // 只有当旧子节点是一组子节点时，才需要逐个卸载， 其他情况什么都不需要做
            if (isArray(n1.children)) {
                n1.children.forEach((c) => unmount(c))
            }
            // 最后将新的文本节点设置给容器元素
            setElementText(container, n2.children)
        } else if (isArray(n2.children)) {
            // 说明新子节点是一组子节点

            // 判断旧子节点是否是一组子节点
            if (isArray(n1.children)) {
                // 重新实现两组子节点的更新方式
                // 新旧 children
                const oldChildren = n1.children
                const newChildren = n2.children
                // 旧的一组子节点的长度
                const oldLen = oldChildren.length
                // 新的一组子节点的长度
                const newLen = newChildren.length
                // 用来存储寻找过程中遇到的最大索引值
                let lastIndex = 0
                // 遍历新的 children
                for (let i = 0; i < newLen; i++) {
                    const newVNode = newChildren[i];
                    let j = 0
                    // 在第一层循环中定义变量 find，代表是否在旧的一组子节点中找到可复用的节点，
                    // 初始值为 false， 代表没找到
                    let find = false
                    // 遍历旧的 children
                    for (j; j < oldLen; j++) {
                        const oldVNode = oldChildren[j];
                        // 如果找到了具有相同key值的两个节点，说明可以复用
                        // 但仍然需要调用 patch 函数更新
                        if (newVNode.key === oldVNode.key) {
                            // 一旦找到可复用的节点，则将变量 find 的值设为 true
                            find = true
                            patch(oldVNode, newVNode, container)
                            if (j < lastIndex) {
                                // 代码运行到这里，说明 newVNode 对应的真实 DOM 需要移动
                                // 先获取 newVNode 的前一个 vnode， 即 prevVNode
                                const prevVNode = newChildren[i - 1]
                                // 如果 prevVNode 不存在，则说明当前 newVNode 是第一个节点，它不需要移动
                                if (prevVNode) {
                                    // 由于我们要将 newVNode 对应的真实 DOM 移动到 prevVNode 所对应真实 DOM 后面，
                                    // 所以我们需要获取 prevVNode 所对应真实 DOM 的下一个兄弟节点，并将其作为锚点
                                    const anchor = prevVNode.el.nextSibling
                                    // 调用 insert 方法将 newVNode 对应的真实 DOM 插入到锚点元素前
                                    // 也就是 prevVNode 对应的真实DOM的后面
                                    insert(newVNode.el, container, anchor)
                                }
                            } else {
                                // 如果当前找到的节点在旧 children 中的索引不小于最大索引值，
                                // 则更新 lastIndex 的值
                                lastIndex = j
                            }
                            break // 这里需要 break
                        }
                    }

                    // 如果代码运行到这里，find 仍然为 false，
                    // 说明当前 newVNode 没有在旧的一组子节点中找到可复用的节点
                    // 也就是说， 当前 newVNode 是新增节点，需要挂载
                    if (!find) {
                        // 为了将节点挂载到正确为止，我们需要先获取锚点元素
                        // 首先获取当前 newVNode 的前一个 vnode 节点
                        const prevVNode = newChildren[i - 1]
                        let anchor = null
                        if (prevVNode) {
                            // 如果有前一个 vnode 节点，则使用它的下一个兄弟节点作为锚点元素
                            anchor = prevVNode.el.nextSibling
                        } else {
                            // 如果没有前一个 vnode 节点，说明即将挂载的新节点是第一个子节点
                            // 这时我们使用容器元素的 firstChild 作为锚点
                            anchor = container.firstChild
                        }
                        // 挂载 newVNode
                        patch(null, newVNode, container, anchor)
                    }

                }

                // 上一步的更新操作完成后
                // 遍历旧的一组子节点
                for (let i = 0; i < oldChildren.length; i++) {
                    const oldVNode = oldChildren[i]
                    // 拿旧子节点 oldVNode 取新的一组子节点中寻找具有相同 key 值的节点
                    const has = newChildren.find((vnode) => vnode.key === oldVNode.key)

                    if (!has) {
                        // 如果没有找到具有相同 key 值的节点，则说明需要删除节点
                        // 调用 unmount 函数将其卸载
                        unmount(oldVNode)
                    }
                }
            } else {
                // 此时:
                // 旧子节点要么就是文本子节点，要么不存在
                // 但不论哪种情况，我们都只需要将容器清空，然后将新的一组子节点逐个挂载
                setElementText(container, '')
                n2.children.forEach((c) => patch(null, c, container))
            }
        } else {
            // 代码运行这里, 说明新子节点不存在

            // 旧子节点是一组子节点，只需要逐个卸载即可
            if (isArray(n1.children)) {
                n1.children.forEach((c) => unmount(c))
            } else if (typeof n1.children === 'string') {
                // 旧子节点是文本子节点，清空内容即可
                setElementText(container, '')
            }
            // 如果也没有旧子节点，那么什么都不需要做
        }
    }

    function mountElement(vnode: any, container: any, anchor) {
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
                patchProps(el, key, null, vnode.props[key])
            }
        }

        // 调用 insert 函数将元素插入到容器内
        insert(el, container, anchor)
    }

    return {
        render
    }
}




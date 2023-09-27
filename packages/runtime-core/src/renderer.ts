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
                // 封装 patchKeyedChildren 函数处理两组子节点
                // 使用双端 Diff 算法
                patchKeyedChildren(n1, n2, container)
            } else {
                // 此时：
                // 旧子节点要么就是文本子节点，要么不存在
                // 但不论那种情况，我们都只需要将容器清空，然后将新的一组子节点逐个挂载
                setElementText(container, "")
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

    function patchKeyedChildren(n1: any, n2: any, container: any) {
        const oldChildren = n1.children
        const newChildren = n2.children

        // 更新相同的前置节点

        // 索引 j 指向新旧两组子节点的开头
        let j = 0
        let oldVNode = oldChildren[j]
        let newVNode = newChildren[j]

        // while 循环向后遍历，直到遇到拥有不同 key 值的节点为止
        while (oldVNode.key === newVNode.key) {
            // 调用 patch 函数进行更新
            patch(oldVNode, newVNode, container)
            // 更新索引 j，让其递增
            j++
            oldVNode = oldChildren[j]
            newVNode = newChildren[j]
        }

        // 更新相同的后置节点
        let oldEnd = oldChildren.length - 1
        let newEnd = newChildren.length - 1

        oldVNode = oldChildren[oldEnd]
        newVNode = newChildren[newEnd]

        // while 循环从后向前遍历，直到遇到拥有不同 key 值的节点为止
        while (oldVNode.key === newVNode.key) {
            // 调用 patch 函数进行更新
            patch(oldVNode, newVNode, container)
            // 递减 oldEnd 和 newEnd
            oldEnd--
            newEnd--

            oldVNode = oldChildren[oldEnd]
            newVNode = newChildren[newEnd]

        }

        // 预处理完毕后，如满足如下条件，则说明 j --> newEnd 之间的节点应该作为新节点插入
        if (j > oldEnd && j <= newEnd) {
            // 锚点的索引
            const anchorIndex = newEnd + 1
            // 锚点元素
            const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
            // 采用 while 循环，调用 patch 函数逐个挂载新增节点
            while (j <= newEnd) {
                patch(null, newChildren[j++], container, anchor)
            }
        } else if (j > newEnd && j <= oldEnd) {
            // j --> oldEnd 之间的节点应该被卸载
            while (j < oldEnd) {
                unmount(oldChildren[j++])
            }
        } else {
            // 构造 source 数组
            // 新的一组子节点中剩余未处理节点的数量
            const count = newEnd - j + 1
            const source = new Array(count)
            source.fill(-1)

            // oldStart 和 newStart 分别为起始索引，即 j
            const oldStart = j
            const newStart = j
            // moved变量代表是否需要移动节点
            let moved = false
            // pos 代表遍历过程中遇到的最大索引值
            let pos = 0
            // 构建索引表
            const keyIndex = {}
            for (let i = newStart; i <= newEnd; i++) {
                keyIndex[newChildren[i].key] = i
            }

            // patched变量， 代表更新过的节点数量
            let patched = 0
            // 遍历旧的一组子节点中剩余未处理的节点
            for (let i = oldStart; i <= oldEnd; i++) {
                oldVNode = oldChildren[i]
                // 如果跟新过的节点数量小于等于需要更新的节点数量，则执行循环
                if (patched <= count) {
                    // 通过索引表快速找到新的一组子节点中具有相同 key 值的节点位置
                    const k = keyIndex[oldVNode.key]

                    if (typeof k !== 'undefined') {
                        newVNode = newChildren[k]
                        // 调用 patch 函数完成更新
                        patch(oldVNode, newVNode, container)
                        // 每更新一个节点， 都将 patched 变量 + 1
                        patched++
                        // 填充 source 数组
                        source[k - newStart] = i
                        // 判断节点是否需要移动
                        if (k < pos) {
                            moved = true
                        } else {
                            pos = k
                        }

                    } else {
                        // 没找到
                        unmount(oldVNode)
                    }
                } else {
                    // 如果更新过的节点数量大于需要更新的节点数量，则卸载多余的节点
                    unmount(oldVNode)
                }
            }

            if (moved) {
                const seq = getSequence(source)
                // s 指向最长递增子序列的最后一个元素
                let s = seq.length - 1
                // i 指向新的一组子节点的最后一个元素
                let i = count - 1
                // for 循环使用得 i 递减，即按照图 24 中的箭头方向移动
                for (i; i >= 0; i--) {
                    if (source[i] === -1) {
                        // 说明索引为 i 的节点是全新的节点，应该将其挂载
                        // 该节点在新 children 中的真实位置索引
                        const p = i + newStart
                        const newVNode = newChildren[pos]
                        // 该节点的下一个节点的位置索引
                        const nextPos = pos + 1
                        // 锚点
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
                        // 挂载
                        patch(null, newVNode, container, anchor)
                    } else if (i !== seq[s]) {
                        // 如果节点的索引i不等于 seq[s]的值，说明该节点需要移动
                        // 该节点在新的一组子节点中的真实位置索引
                        const pos = i + newStart
                        const newVNode = newChildren[pos]
                        // 该节点的下一个节点的位置索引
                        const nextPos = pos + 1
                        // 锚点
                        const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
                        // 移动
                        insert(newVNode.el, container, anchor)
                    } else {
                        // 当 i == seq[s] 时， 说明该节点不需要移动
                        // 是需要让 s 指向下一个位置
                        s--
                    }
                }
            }


        }

    }

    function getSequence(arr) {
        // 复制原始数组
        const p = arr.slice()
        // 最长递增子序列的结果，默认值为 [0]
        // 这么做是为了方便比较
        const result = [0]
        // i 代表数组中的起始索引
        // j 代表最长递增子序列中最小值的索引，也是最长递增子序列的长度
        // u 代表二分查找中的左侧索引值
        // v 代表二分查找中的右侧索引值
        // c 代表二分查找中的中间索引值
        let i, j, u, v, c
        const len = arr.length
        // 从左向右依次遍历数组中的元素
        for (i = 0; i < len; i++) {
            // 获取数组索引值为 i 的元素值
            const arrI = arr[i]
            // 由于 result 数组中已经存储了值为0的元素，arrI 等于 0 的情况排除
            if (arrI !== 0) {
                // 获取结果数组中的最小值的索引
                j = result[result.length - 1]
                // 如果 result 中的最小值小于 arrI，则代表需要将其添加到 result 数组的末尾
                if (arr[j] < arrI) {
                    // 将 p[i] 的值设置为当前最长递增子序列的长度
                    p[i] = j
                    // 将当前索引添加到 result 数组中
                    result.push(i)
                    continue
                }

                // 走到这里代表 arr[j] >= arrI，表示数组中当前的值大于最小值了
                // 需要使用二分查找法找到第一个小于 arrI 的值
                u = 0
                v = result.length - 1
                while (u < v) {
                    c = ((u + v) / 2) | 0
                    if (arr[result[c]] < arrI) {
                        u = c + 1
                    } else {
                        v = c
                    }
                }

                // 如果找到了将对应位置的值进行替换
                if (arrI < arr[result[u]]) {
                    if (u > 0) {
                        p[i] = result[u - 1]
                        result[u] = i
                    }
                }
            }
        }

        u = result.length
        v = result[u - 1]
        // 由于 result 的索引从后向前的，所以需要反向序列化
        while (u-- > 0) {
            result[u] = v
            v = p[v]
        }
        return result
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




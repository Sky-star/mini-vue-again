import { normalizeClass, isString } from '../../shared/src/index';
// 文本节点类型
export const Text = Symbol()
// 注释节点类型
export const Comment = Symbol()
// 片段类型
export const Fragment = Symbol()

export function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null
    }

    // 对 class 进行序列化
    if (props) {
        // class 是关键字， 需使用别称
        let { class: klass } = props
        if (klass && !isString(klass)) {
            props.class = normalizeClass(klass)
        }
    }


    return vnode
}

// 创建文件节点类型的 vnode
export function createTextVNode(text) {
    return createVNode(Text, {}, text)
}


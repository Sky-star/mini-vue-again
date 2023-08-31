import { createRenderer } from "../../runtime-core/src/renderer"

function createElement(type) {
    return document.createElement(type)
}

function setElementText(el, text) {
    el.textContent = text
}

function insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
}

function remove(el) {
    const parent = el.parentNode
    if (parent) {
        parent.removeChild(el)
    }
}

function createText(text) {
    return document.createTextNode(text)
}

function createComment(text) {
    return document.createComment(text)
}

function setText(el, text) {
    el.nodeValue = text
}

function shouldSetAsProps(el, key, value) {
    // 特殊处理
    if (key === "form" || el.tagName === "INPUT") return false
    // 兜底
    return key in el
}

// 将属性设置相关的操作封装到patchProps函数中，并作为渲染器选项传递
function patchProps(el, key, preValue, nextValue) {
    // 匹配以 on 开头的属性， 视其为事件
    if (/^on/.test(key)) {
        // 定义 el._vei 为一个对象，存在事件名称到事件处理函数的映射
        const invokers = el._vei || (el._vei = {})
        // 根据事件名称获取 invoker
        let invoker = invokers(key)
        // 根据属性名称得到对应的事件名称，例如 onClick ---> click
        const name = key.slice(2).toLowerCase()
        if (nextValue) {
            if (!invoker) {
                // 如果没有 invoker, 则将一个伪造的 invoker 缓存到 el._vei 中
                // vei 是 vue event invoker 的首字母缩写
                // 将事件处理函数缓存到el._vei[key] 下， 避免覆盖
                invoker = el._vei[key] = (e) => {
                    // e.timeStamp 是事件发生的时间
                    // 如果事件发生的时间早于事件函数绑定的时间，则不执行事件处理函数
                    if (e.timeStamp < invoker.attached) return
                    // 如果 invoker.value 是数组，则遍历它并逐个调用时间处理函数
                    if (Array.isArray(invoker.value)) {
                        invoker.value.forEach(fn => fn(e))
                    } else {
                        // 否则直接作为函数调用
                        // 当伪造的事件处理函数执行时，会执行真正的事件处理函数
                        invoker.value(e)
                    }
                }
                // 将真正的事件处理函数复制给 invoker.value
                invoker.value = nextValue
                // 存储事件处理函数被绑定时间
                invoker.attached = performance.now()
                // 绑定 invoker 作为事件处理函数
                el.addEventListener(name, invoker)
            } else {
                // 如果 invoker 存在， 意味着更新，并且只需要更新 invoker.value 的值即可
                invoker.value = nextValue
            }
        } else if (invoker) {
            // 新的事件绑定函数不存在， 且之前绑定的 invoker 存在，则移除绑定
            el.removeEventListener(name, invoker)
        }

    } else if (key === 'class') {
        // 出于对性能的考虑， 需要对 class 进行特殊的处理
        // 另外的 style 也是类似的
        el.className = nextValue || ''
    } else if (shouldSetAsProps(el, key, nextValue)) {
        const type = typeof el[key]
        if (type === "boolean" && nextValue === "") {
            el[key] = true
        } else {
            el[key] = nextValue
        }
    } else {
        el.setAttribute(key, nextValue)
    }
}



const renderer: any = createRenderer({
    createElement,
    patchProps,
    insert,
    remove,
    setElementText,
    createText,
    setText,
    createComment
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

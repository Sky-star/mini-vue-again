import { createRenderer } from "../../runtime-core/src/render"

function createElement(type) {
    return document.createElement(type)
}

function setElementText(el, text) {
    el.textContent = text
}

function insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
}

function shouldSetAsProps(el, key, value) {
    // 特殊处理
    if (key === "form" || el.tagName === "INPUT") return false
    // 兜底
    return key in el
}

// 将属性设置相关的操作封装到patchProps函数中，并作为渲染器选项传递
function patchProps(el, key, preValue, nextValue) {
    // 出于对性能的考虑， 需要对 class 进行特殊的处理
    // 另外的 style 也是类似的
    if (key === 'class') {
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
    setElementText
})

export function createApp(...args) {
    return renderer.createApp(...args)
}

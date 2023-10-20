const Teleport = {
    __isTeleport: true,
    process(n1, n2, container, anchor, internals) {
        // 通过 internals 参数取得渲染器的内部方法
        const { patch, patchChildren, move } = internals
        // 如果旧 VNode n1 不存在，则是全新的挂载，否则执行更新
        if (!n1) {
            // 挂载
            // 获取容器，即挂载点
            const target = typeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
            // 将 n2.children 渲染到指定挂载点即可
            n2.children.forEach(c => patch(null, c, target, anchor))
        } else {
            // 更新
            patchChildren(n1, n2, container)
            // 如果新旧 to 参数的值不同，则需要对内容进行移动
            if (n2.props.to !== n1.props.to) {
                // 获取新的内容
                const newTarget = typeof n2.props.to === 'string' ? document.querySelector(n2.props.to) : n2.props.to
                // 移动到新的容器
                n2.children.forEach(c => move(c, newTarget))
            }
        }
    }
}
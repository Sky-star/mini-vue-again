// 全局变量， 存储当前正在被初始化的组件实例
let currentInstance = null

// 该方法接收组件实例作为参数，并将该实例设置为 currentInstance
function setCurrentInstance(instance) {
    currentInstance = instance
}



export { setCurrentInstance }
const KeepAlive = {
  // KeepAlive组件独有属性，用作标识
  __isKeepAlive: true,
  props: {
    include: RegExp,
    exclude: RegExp,
  },
  setup(props, { slots }) {
    // 创建一个缓存对象
    // key: vnode.type
    const _cache = new Map()
    const cache = {
      get (key) {
        return _cache.get(key)
      },
      set (key, value) {
        _cache.set(key, value)
      },
      delete (key) {
        _cache.delete(key)
      },
      forEach (fn) {
        _cache.forEach(fn)
      }
    }
    // 当前KeepAlive组件实例
    const instance = currentInstance
    // 对于KeepAlive组件来说，它的实例上存在特殊的keepAliveCtx对象，该对象由渲染器注入
    // 该对象会暴露渲染器的一些内部方法，其中move函数用来将一段DOM移动到另一个容器中
    const { move, createElement } = instance.keepAliveCtx
    // 创建隐藏容器
    const storageContainer = createElement('div')
    // keepAlive组件的实例上会被添加两个内部函数，分别是_deActivate和_activate
    // 这两个函数会在渲染器中被调用
    instance._deActivate = (vnode) => {
      move(vnode, storageContainer)
    }
    instance._activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }

    return () => {
      // KeepAlive的默认插槽就是要被KeepAlive的组件
      let rawVNode = slots.default()
      // 如果不是组件，直接渲染即可，因为非组件的虚拟节点无法被KeepAlive
      if (typeof rawVNode.type !== 'object') {
        return rawVNode
      }
      // 获取组件内部的name值
      const name = rawVNode.type.name
      if (name && (
        // 如果name无法被include匹配
        (props.include && !props.include.test(name)) ||
        // 或者被exlude匹配
        (props.exclude && props.exclude.test(name))
      )) {
        // 直接渲染“内部组件”，不对其进行后续缓存操作
        return rawVNode
      }
      // 在挂载时先获取缓存的组件vnode
      const cachedVNode = cache.get(rawVNode.type)
      if (cachedVNode) {
        // 如果有缓存内容，说明不应该直接挂载，而应该执行激活
        // 继承组件实例
        rawVNode.component = cachedVNode.component
        // 在vnode上添加keptalive属性，标记为true，避免渲染器重新挂载它
        rawVNode.keptalive = true
      } else {
        // 如果没有缓存内容，则直接挂载
        cache.set(rawVNode.type, rawVNode)
      }
      //在组件上添加shouldKeepAlive属性，并标记为true，避免渲染器真的将组件卸载
      rawVNode.shouldKeepAlive = true
      // 将keepAlive组件的实例也添加到vnode上，以便在渲染器中访问
      rawVNode.keepAliveInstance = instance
      // 渲染组件vnode
      return rawVNode
    }
  }
}

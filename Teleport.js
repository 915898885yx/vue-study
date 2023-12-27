const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    // 通过internals参数取得渲染器内部方法
    const { patch } = internals
    if (!n1) {
      // 挂载
      const target = typeof n2.props.to === 'string'
        ? document.querySelector(n2.props.to)
        : n2.props.to
      // 将n2.children渲染器到执行挂载点即可
      n2.children.forEach(c => patch(null, c, target, anchor))
    } else {
      // 更新
      patchChildren(n1, n2, container)
      // 如果新旧to参数值不同，需要对内容移动
      if (n1.props.to !== n2.props.to) {
        const newTarget = typeof n2.props.to === 'string'
          ? document.querySelector(n2.props.to)
          : n2.props.to
        n2.children.forEach(c => move(c, newTarget))
      }
    }
  }
}
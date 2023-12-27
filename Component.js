
const MyComponent = {
  name: 'MyComponent',

  data () {
    return {
      foo: 'hello world'
    }
  },
  render () {
    return {
      type: 'div',
      children: `foo的值是${this.foo}`
    }
  }
}
const CompVNode = {
  type: MyComponent
}

renderer.render(CompVNode, document.querySelector('#app'))

// 全局变量，存储当前正在被初始化的组件实例
let currentInstance = null
// 该方法接受组件实例作为参数，并将该实例设置为currentInstance
function setCurrentInstance (instance) {
  currentInstance = instance
}

function onMounted (fn) {
  if (currentInstance) {
    currentInstance.mounted.push(fn)
  } else {
    console.error('onMounted函数只能在setup中调用')
  }
}
function mountComponent (vnode, container, anchor) {
  const componentOptions = vnode.type
  
  const { render, data, setup, props: propsOption, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated } = componentOptions
  
  beforeCreate && beforeCreate()
  
  // 调用data得到原始数据，调用reactive包装为响应式数据
  const state = reactive(data())
  // resolveProps 函数解析处最终的props数据与attr数据
  const [props, attrs] = resolveProps(propsOption, vnode.props)

  // 直接使用编译好的vnode.children作为slots对象
  const slots = vnode.children || {}

  // 调用render函数是，将this设置为state

  const instance = {
    state,
    props: shallowReactive(props),
    isMounted: false,
    subTree: null,
    slots,
    // 组件实例中添加mounted参数，用来存储通过onMounted函数注册的生命周期钩子函数
    mounted: []
  }

  // 检查当前挂载的组件是否keepalive
  const isKeepLiave = vnode.type.__isKeepAlive
  if (isKeepLiave) {
    instance.keepAliveCtx = {
      move (vnode, container, anchor) {
        insert(vnode.component.subTree.el, container, anchor)
      },
      createElement
    }
  }

  function emit(event, ...payload) {
    const eventName = `on${event[0].toUpperCase() + event.slice(1)}`

    const handler = instance.props[eventName]

    if (handler) {
      handler(...payload)
    } else {
      console.error('事件不存在')
    }
  }

  const setupContext = { attrs, emit, slots }
  // 在调用setuo函数前，设置当前组件实例
  setCurrentInstance(instance)
  // 调用 setup 函数，将只读版本的 props 作为第一个参数传递，避免用户意外地修改 props 的值，
  const setupResult = setup(shallowReadonly(instance.props), setupContext)
  // 在setup函数执行完毕后，重制当前组件实例
  setCurrentInstance(null)
  // setupState 用来存储由 setup 返回的数据
  let setupState = null
  // 如果setup函数的返回值是函数，则将其作为渲染函数
  if (typeof setupResult === 'function') {
    if (render) {
      console.error('setup函数返回渲染函数，render选项将被忽略')
    }
    render = setupResult
  } else {
    // 如果不是函数，则作为数据状态赋值给setupState
    setupState = setupResult
  }
  
  vnode.component = instance

  // 创建渲染上下文对象，本质上是组件实例的代理
  const renderContext = new Proxy(instance, {
    get (t, k, r) {
      // 取得组件自身状态与props数据
      const { state, props, slots } = t
      if (k === '$slots') return slots
      // 先尝试读取自身状态数据
      if (state && k in state) {
        return state[k]
      } else if (k in props) {
        // 如果组件自身没有该数据，则尝试从props中读取
        return props[k]
      } else if (setupState && k in setupState) {
        return setupState[k]
      } else {
        console.error('不存在')
      }
    },
    set (t, k, v, r) {
      const { state, props } = t
      if (state && k in props) {
        state[k] = v
      } else if (k in props) {
        console.warn(`Attempting to mutate prop "${k}". Props are readonly`)
      } else if (setupState && k in setupState) {
        setupState[k] = v
      } else {
        console.error('不存在')
      }
    }
  })

  created && created.call(renderContext)

  effect(() => {
    const subTree = render.call(state, state)
    if (!instance.isMounted) {
      beforeMount && beforeMount.call(state)

      patch(null, subTree, container, anchor)
      instance.isMounted = true

      mounted && mounted.call(state)

      // 遍历instance.mounted数组，依次执行
      instance.mounted && instance.mounted.forEach(hook => hook.call(renderContext))
    } else {
      beforeUpdate && beforeUpdate.call(state)
      patch(instance.subTree, subTree, container, anchor)

      updated && updated.call(state)
    }
    instance.subTree = subTree
  }, {
    scheduler: queueJob
  })
}

function patchComponent (n1, n2, anchor) {
  // 获取组件实例，即n1.component，同时让新的组件虚拟节点n2.component指向新的组件实例
  const instance = (n2.component = n1.component)

  const { props } = instance

  if (hasPropsChanged(n1.props, n2.props)) {
    const [ nextProps ] = resolveProps(n2.type.props, n2.props)
    // 更新props
    for (const k in nextProps) {
      props[k] = nextProps[k]
    }
    // 删除不存在的props
    for (const k in props) {
      if (!(k in nextProps)) delete props[k]
    }
  }
}

function hasPropsChanged (prevProps, nextProps) {
  const nextKeys = Object.keys(nextProps)
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true
  }
  
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i]
    if (nextProps[key] !== prevProps[key]) {
      return true
    }
  }
  return false
}

function resolveProps (options, propsData) {
  const props = {}
  const attrs = {}
  /**
  *
  * 在 Vue.js 3 中，没有定义在 MyComponent.props 选项中的props 数据将存储到 attrs 对象中。
  */
  for (const key in propsData) {
    if (key in options || key.startsWith('on')) {
      // 如果为组件传递的props数据在组件自身的props选项中有定义，则将其视为合法的props
      props[key] = propsData[key]
    } else {
      attrs[key] = propsData[key]
    }
  }
  return [ props, attrs ]
}

// 调度器
// 用一个Set标识队列，自动去重
const queue = new Set()
// 一个标志，代表是否在刷新任务队列
let isFlushing = false
// 创建一个resolve的Promise实例
const p = Promise.resolve()
// 调度器主要函数
function queueJob (job) {
  // 将job添加到任务队列queue
  queue.add(job)
  // 如果没有在刷新任务队列,则刷新
  if (!isFlushing) {
    // 该标志设置为true，避免重复刷新
    isFlushing = true
    p.then(() => {
      try {
        queue.forEach(job => job())
      } finally {
        // 重制状态
        isFlushing = false
        queue.clear = 0
      }
    })
  }
}



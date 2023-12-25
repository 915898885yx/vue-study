// defineAsyncComponent 函数用于定义一个异步组件，接受一个异步组件加载器作为参数

defineAsyncComponent({
  loader: () => new Promise(r => {/**/}),
  delay: 200,
  loadingComponent: ''
})

function defineAsyncComponent (options) {
  if (typeof options === 'function') {
    options = {
      loader: options
    }
  }
  const { loader } = options
  // 定义变量用来存储异步加载的组件
  let InnerComp = null

  // 记录重试次数
  const retries = 0

  // 封装load函数来加载异步组件
  function load () {
    return loader()
      // 捕获加载器错误
      .catch((err) => {
        // 如果指定了onError回调，则将控制权交给用户
        if (options.onError) {
          // 返回一个新的Promise实例
          return new Promise((resolve, reject) => {
            // 重试
            const retry = () => {
              resolve(load())
              retries++
            }
            // 失败
            const fail = () => reject(err)
            
            options.onError(retry, fail, retries)
          })
        } else {
          throw error
        }
      })
  }

  return {
    name: 'AsyncComponentWrapper',
    setup () {
      // 异步组件是否加载成功
      const loaded = ref(false)
      // 代表是否超时，默认为false，没有超时
      // const timeout = ref(false)
      // 定义error，当错误发生时，用过来存储错误对象
      const error = shallowRef(null)
      // 代表是否正在加载，默认为false
      const loading = ref(false)
      let loadingTimer = null
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay)
      } else {
        loading.value = true
      }
      // 执行加载器函数，返回一个Promise实例
      // 加载成功后，将加载成功的组件赋值给InnerComp,并将loaded标记为true，代表加载成功
      load().then(c => {
        InnerComp = c
        loaded.value = true
      }).catch(err => error.value = err)
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })
      

      let timer = null
      if (options.timeout) {
        // 如果指定了超时时常，则开启一个定时器计时
        timer = setTimeout(() => {
          // 超时后创建一个错误对象，复制给error.value
          // timeout.value = true
          const err = new Error('Async component timed out after ' + options.timeout + 'ms.')
          error.value = err
        }, options.timeout)
      }

      // 包装组件被卸载时清除定时器
      onUnmounted(() => {
        clearTimeout(timer)
      })

      // 占位内容
      const placeholder = {
        type: Text,
        children: ''
      }

      return () => {
        // 如果异步组件加载成功，则渲染该组件
        if (loaded.value) {
          // 如果异步组件加载成功，则渲染该组件
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          // 只有当错误存在且用户配置了 errorComponent 时才展示 Error组件，同时将 error 作为 props 传递如果超时，并且用户指定了Error组件，则渲染该组件
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          return { type: options.loadingComponent }
        } else {
          return placeholder
        }
        
      }
    }
  }
}

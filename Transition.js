const Transition = {
  name: 'Transition',
  setup (props, { slots }) {
    return () => {
      const innerVNode = slots.default()

      innerVNode.transition = {
        beforeEnter(el) {
          el.classList.add('enter-from')
          el.classList.add('enter-active')
        },
        enter(el) {
          nextFrame(() => {
            el.classList.remove('enter-from')
            el.classList.add('enter-to')
            el.addEventListener('transitionend', () => {
              el.classList.remove('enter-to')
              el.classList.remove('enter-active')
            })
          })
        },
        leave(el, performRemove) {
          nextFrame(() => {
            el.classList.remove('leave-from')
            el.classList.add('leave-to')
            el.addEventListener('transitionend', () => {
              el.classList.remove('leave-from')
              el.classList.remove('leave-active')
              performRemove()
            })
          })
        }
      }
      return innerVNode
    }
  }
}

// 01 /* 初始状态 */
// 02 .leave-from {
// 03 transform: translateX(0);
// 04 }
// 05 /* 结束状态 */
// 06 .leave-to {
// 07 transform: translateX(200px);
// 08 }
// 09 /* 过渡过程 */
// 10 .leave-active {
// 11 transition: transform 2s ease-out;
// 12 }
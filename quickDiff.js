function patchKeyedChildren(n1, n2, container) {
  const newChildren = n2.children
  const oldChildren = n1.children
  // 处理相同的前置节点
  // 索引j指向新旧两组子节点的开头
  let j = 0
  let oldVNode = oldChildren[j]
  let newVNode = newChildren[j]
  // while循环向后遍历，直到遇到拥有不同的key值的节点位置
  while (oldVNode.key === newVNode.key) {
    patch(oldVNode, newVNode, container)

    j++

    oldVNode = oldChildren[j]
    newVNode = newChildren[j]
  }

  // 更新相同的后置节点
  let oldEnd = oldChildren.length - 1
  let newEnd = newChildren.length - 1
  oldVNode = oldChildren[oldEnd]
  newVNode = newChildren[newEnd]

  // while循环，从后往前遍历，直到遇到不同的key值的节点为止
  while (oldVNode.key === newVNode.key) {
    patch(oldVNode, newVNode, container)
    oldEnd--
    newEnd--
    oldVNode = oldChildren[oldEnd]
    newVNode = newChildren[newEnd]
  }
    
  // j --- newEnd之间的节点作为新节点插入
  if (j > oldEnd && j <= newEnd) {
    // 新增节点的情况
    // 锚点的索引
    const anchorIndex = newEnd + 1
    // 锚点元素
    const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null
    while(j <= newEnd) {
      patch(null, newChildren[j++], container, anchor)
    }
  } else if (j > newEnd && j <= oldEnd) {
    // 删除节点情况
    while(j <= oldEnd) {
      unmount(oldChildren[j++])
    }
  } else {
    // 新的一组子节点中剩余未处理节点的数量
    const count = newEnd - j + 1
    const source = new Array(count)
    source.fill(-1)

    // oldStart 和 newStart分别为起始索引，j
    let oldStart = j
    let newStart = j
    let moved = false
    let pos = 0

    // 构建索引表
    const keyIndex = {}

    for (let i = newStart; i <= newEnd; i++) {
      keyIndex[newChildren[i].key] = i
    }
    // 更新过的节点数量
    let patched = 0

    for (let i = oldStart; i < oldEnd; i++) {
      const oldVNode = oldChildren[i]
      if (patched <= count) {
        const k = keyIndex[oldVNode.key]
        if (typeof k !== 'undefined') {
          newVNode = newChildren[k]
          patch(oldVNode, newVNode, container)
          source[k - newStart] = i
          // 判断是否需要移动
          if (k < pos) {
            moved = true
          } else {
            pos = k
          }
        } else {
          unmount(oldVNode)
        }
      } else {
        // 更新过的节点数量大于需要更新的节点数量，则卸载多余的节点
        unmount(oldVNode)
      }
    }

    if (moved) {
      // 计算最长递增子序列
      const seq = lis(source) // [0, 1]

      // s指向最长递增子序列的最后一个元素
      let s = seq.length - 1
      // i指向新的一组子节点的最后一个元素
      let i = count - 1
      for (i; i >= 0; i--) {
        if (source[i] === -1) {
          // 说明该节点是新节点，挂载
          const pos = i + newStart
          const newVNode = newChildren[pos]

          const nextPos = pos + 1

          const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
          
          patch(null, newVNode, container, anchor)
        } else if (i !== seq[s]) {
          // 如果节点的索引值i不等于seq[s]的值，说明该节点需要移动
          const pos = i + newStart
          const newVNode = newChildren[pos]
          const nextPos = pos + 1
          const anchor = nextPos < newChildren.length ? newChildren[nextPos].el : null
          insert(newVNode.el, container, anchor)
        } else {
          // 当i===seq[s]时，说明该位置的节点不需要移动
          // 只需要让s指向下一个位置
          s--
        }
      }
    }
  }
}

// 获取最长子序列方法：vue3
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = ((u + v) / 2) | 0;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}


/**
(1) 分析模板，将其解析为模板 AST。
(2) 将模板 AST 转换为用于描述渲染函数的 JavaScript AST。
(3) 根据 JavaScript AST 生成渲染函数代码。
 */
const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始
  tagName: 3, // 标签名称
  text: 4, // 文本状态
  tagEnd: 5, // 结束标签状态
  tagEndName: 6 // 结束标签名称状态
}

function isAlpha (char) {
  return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z'
}
// 接收模版字符串作为参数，并将模版切割为Token返回
function tokenize (str)  {
  // 状态机的当前状态：初始状态
  let currentState = State.initial
  // 用户缓存字符
  const chars = []
  // 生成Token会存储到tokens数组中，并作为函数的返回值返回
  const tokens = []
  // 用于while循环开启自动机，只要模版字符串没有被消费尽，自动机就会一直运行
  while(str) {
    // 查看第一个字符，注意这里只是查看，没有消费该字符
    const char = str[0]
    // debugger
    // switch语句匹配当前状态
    switch (currentState) {
      // 处于初始状态
      case State.initial:
        // 遇到字符 <
        if (char === '<') {
          // 1.状态机切换到标签开始状态
          currentState = State.tagOpen
          // 2.消费字符 <
          str = str.slice(1)
        } else if (isAlpha(char)) {
          // 1.遇到字母，切换到文本状态
          currentState = State.text
          // 2.将当前的字符缓存到chars数组
          chars.push(char)
          // 3.消费当前字符
          str = str.slice(1)
        }
        break
      // 状态机当前处于标签开始状态
      case State.tagOpen:
        if (isAlpha(char)) {
          // 1.遇到字母，切换到标签名称状态
          currentState = State.tagName
          // 2.当前字符缓存到chars数组
          chars.push(char)
          // 3.消费当前字符
          str = str.slice(1)
        } else if (char === '/') {
          // 1.遇到字符/，切换到结束标签状态
          currentState = State.tagEnd
          // 2.消费字符/
          str = str.slice(1)
        }
        break
      // 当前状态机处于标签名称状态
      case State.tagName:
        if (isAlpha(char)) {
          // 1.遇到字母，由于当前处于标签名称状态，所以不需要切换状态
          chars.push(char)
          // 消费字符
          str = str.slice(1)
        } else if (char === '>') {
          // 遇到字符>, 切换到初始状态
          currentState = State.initial
          // 同时创建一个标签Token，并添加到tokens数组中
          // 注意此时chars数组中缓存的字符就是标签名称
          tokens.push({
            type: 'tag',
            name: chars.join('')
          })
          // chars数组的内容已经被消费，清空
          chars.length = 0
          // 同时消费当前字符 >
          str = str.slice(1)
        }
        break
      // 当前状态机处于文本状态
      case State.text:
        if (isAlpha(char)) {
          // 遇到字母，保持状态不变，但应该将当前字符缓存到chars数组
          chars.push(char)
          // 消费当前字符
          str = str.slice(1)
        } else if (char === '<') {
          // 遇到字符 < 切换到标签开始状态
          currentState = State.tagOpen
          // 从文本状态---> 标签开始状态，此时应该创建文本Token
          tokens.push({
            type: 'text',
            content: chars.join('')
          })
          // chars数组内容被消费，清空
          chars.length = 0
          // 消费当前字符
          str = str.slice(1)
        }
        break
      // 状态机处于标签结束状态
      case State.tagEnd:
        if (isAlpha(char)) {
          // 遇到字母，切换到结束标签名称状态
          currentState = State.tagEndName
          // 将当前字符缓存到chars数组
          chars.push(char)
          // 消费当前字符
          str = str.slice(1)
        }
        break
      // 状态机当前呢处于结束标签名称状态
      case State.tagEndName:
        if (isAlpha(char)) {
          // 遇到字母，不需要切换状态，但需要将当前字符缓存到chars中
          chars.push(char)
          str = str.slice(1)
        } else if (char === '>') {
          // 遇到字符>,切换到初始状态
          currentState = State.initial
          // 从结束标签名称状态-->，初始状态，应该保存结束标签名称Token
          tokens.push({
            type: 'tagEnd',
            name: chars.join('')
          })
          chars.length = 0
          str = str.slice(1)
        }
        break
    }
  }
  // 最后返回tokenns
  return tokens
}

// parse函数接收模版作为参数
function parse(str) {
  // 首先对模版进行标记化，得到tokens
  const tokens = tokenize(str)
  // 创建Root根节点
  const root = {
    type: 'Root',
    children: []
  }
  // 创建elementStack栈，起初只有Root根节点
  const elementStack = [root]
  // 开启一个while循环扫描tokens，直到所有的Token都被扫描完毕为止
  while(tokens.length) {
    // 获取当前栈顶节点作为父节点parent
    const parent = elementStack[elementStack.length - 1]
    // 当前扫描的token
    const t = tokens[0]
    switch (t.type) {
      case 'tag':
        // 如果当前Token是开始标签，则创建Element类型的AST节点
        const elementNode = {
          type: 'Element',
          tag: t.name,
          children: []
        }
        // 将其添加到父级节点的children中
        parent.children.push(elementNode)
        // 将当前节点压入栈
        elementStack.push(elementNode)
        break
      case 'text':
        // 如果当前Token是文本，则创建的Text类型的Ast节点
        const textNode = {
          type: 'Text',
          content: t.content
        }
        // 将其添加到父节点的children中
        parent.children.push(textNode)
        break
      case 'tagEnd':
        // 遇到结束标签，将栈顶节点弹出
        elementStack.pop()
        break
    }
    tokens.shift()
  }
  // 最后返回AST
  return root
}

function dump (node, indent = 0) {
  // 节点的类型
  const type = node.type
  /**
   * 节点的描述，如果是根节点，则没有描述
   * 如果是Element类型的节点，则使用node.tag作为节点的描述
   * 如果是Text类型的节点，则使用node.content作为节点描述
   */
  const desc = node.type === 'Root'
    ? ''
    : node.type === 'Element'
      ? node.tag
      : node.content
  // 打印节点的类型和描述信息
  console.log(`${'-'.repeat(indent)}${type}: ${desc}`)
  // console.log(JSON.stringify(node, null, 2))
  // 递归地打印字节点
  if (node.children) {
    node.children.forEach(n => dump(n, indent + 2))
  }
}

function traverseNode (ast, context) {
  // 设置当前转换节点的信息 context.currentNode
  context.currentNode = ast
  // 增加退出阶段的回调函数数组
  const exitFns = []
  // context.nodeTransform是一个数组，其中每一个元素都是一个函数
  const transforms = context.nodeTransforms
  for (let i = 0; i < transforms.length; i++) {
    // 将当前节点currentNode和context都传递给nodeTransforms中注册的回掉函数
    const onExit = transforms[i](context.currentNode, context)
    if (onExit) {
      // 将退出阶段的回调函数添加到exitFns中
      exitFns.push(onExit)
    }
    // 由于任何的转换函数都可能移除当前节点，因此每个转换函数执行完毕后
    // 都应该检查当前节点是否已经被移除，如果被移除了就直接返回即可
    if (!context.currentNode) return
  }

  // 如果有子节点，则递归调用traverseNode函数进行遍历
  const children = context.currentNode.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      context.parent = context.currentNode
      context.childIndex = i
      traverseNode(children[i], context)
    }
  }

  // 在节点处理的最后阶段执行缓存到exitFns中的回调函数
  // 注意反序执行
  let i = exitFns.length
  while(i--) {
    exitFns[i]()
  }
}

// 封装transform函数，用来对AST进行转换
function transform (ast) {
  // 在transform函数内创建context对象
  const context = {
    // currentNode存储当前正在转换的节点
    currentNode: null,
    // childrenIndex存储当前节点在父节点的chidren中的索引
    childIndex: 0,
    // 增加parent，用来存储当前转换节点的父节点
    parent: null,
    replaceNode (node) {
      /**
       * 为了替换节点，我们需要修改AST
       * 找到当前节点在父节点的children中的位置：context.childrenIndex
       * 然后使用新节点替换即可
       */
      context.parent.children[context.childIndex] = node
      // 由于当前节点已经被新节点替换掉了，因此我们需要将currentNode更新为新节点
      context.currentNode = node
    },
    // 用于删除当前节点
    removeNode () {
      if (context.parent) {
        // 调用函数的splice方法，根据当前节点的索引删除当前节点
        context.parent.children.splice(context.childIndex, 1)
        // 将context.currentNode置空
        context.currentNode = null
      }
    },
    // 注册nodeTransforms数组
    nodeTransforms: [
      transformElement, // transformElement转换标签节点
      transformText,     // transformText转换文本节点
      transformRoot
    ]
  }
  // 调用traverseNode完成转换
  traverseNode(ast, context)
  dump(ast)
}

function transformRoot(node) {
  // 将逻辑编辑卸载退出阶段回调，保证子节点全部被处理完毕
  return () => {
    // 如果不是跟节点，什么都不做
    if (node.type !== 'Root') {
      return
    }
    const vnodeJSAST = node.children[0].jsNode
    node.jsNode = {
      type: 'FunctionDecl',
      id: { type: 'Identifier', name: 'render' },
      params: [],
      body: [
        {
          type: 'ReturnStatement',
          return: vnodeJSAST
        }
      ]
    }
  }
}

function transformElement(node, context) {
  // 进入节点
  if (node.type === 'Element' && node.tag === 'p') {
    node.tag = 'h1'
  }
  // 返回一个会在退出节点时执行的回调函数

  return () => {
    // 将转换代码编写在退出阶段的回调函数中
    // 这样可以保证该标签节点的字节点全部被处理完毕
    if (node.type !== 'Element') {
      return
    }
    // 1.创建h函数调用语句
    // h函数调用的第一个参数的标签名称，因此我们以node.tag来创建一个字符串字面量节点作为第一个参数
    const callExp = createCallExpression('h', [
      createStringLiteral(node.tag)
    ])
    // 处理h函数调用语句的参数
    node.children.length === 1
      ? callExp.arguments.push(node.children[0].jsNode)
      : callExp.arguments.push(
        createArrayExpression(node.children.map(c => c.jsNode))
      )
    node.jsNode = callExp
  }
}

function transformText(node, context) {
  // 如果不是文本节点，则什么都不做
  if (node.type !== 'Text') {
    return
  }
  // 文本节点对应的Javascript AST节点其实就是一个字符串字面量
  // 因此只需要使用node.content创建一个StringLiteral类型的节点即可
  // 最后将文本节点对应的JavaScript AST节点添加到node.jsNode属性下
  node.jsNode = createStringLiteral(node.content)
}

function render () {
  // h函数第一个参数是一个字符串字面量
  // h函数的第二个参数是一个数组
  return h('div', [/**... */])
}

const CallExp = {
  type: 'CallExpression',
  callee: {
    type: 'Identifier',
    name: 'h'
  },
  // 参数
  arguments: []
}

const Str = {
  type: 'StringLiteral',
  value: 'div'
}

const Arr = {
  type: 'ArrayExpression',
  // 数组中的元素
  elements: []
}

const FunctionDeclNode = {
  type: 'FunctionDecl', // 代表该节点时函数声明
  // 函数的名称是一个标识符，标识符本身也是一个节点
  id: {
    type: 'Identifier',
    name: 'render'
  },
  // 参数
  params: [],
  body: [
    {
      type: 'ReturnStatement',
      // 最外层用h函数调用
      return: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'h'
        },
        // 参数
        arguments: [
          // 第一个参数是字符串字面量‘div’
          {
            type: 'StringLiteral',
            value: 'div'
          },
          // 第二个参数是数组
          {
            type: 'ArrayExpression',
            elements: [
              // 第一个元素是字符串字面量
              {
                type: 'CallExpression',
                callee: {
                  type: 'Identifier',
                  name: 'h'
                },
                arguments: [
                  {
                    type: 'StringLiteral',
                    value: 'p'
                  },
                  {
                    type: 'StringLiteral',
                    value: 'Vue'
                  }
                ]
              },
              {
                type: 'CallExpression',
                callee: {
                  type: 'Identifier',
                  name: 'h'
                },
                arguments: [
                  {
                    type: 'StringLiteral',
                    value: 'p'
                  },
                  {
                    type: 'StringLiteral',
                    value: 'Template'
                  }
                ]
              }
            ]
          }
        ]
      }
    }
  ]
}

// 创建StringLiteral节点
function createStringLiteral (value) {
  return {
    type: 'StringLiteral',
    value
  }
}

function createIdentifier (name) {
  return {
    type: 'Identifier',
    name
  }
}

function createArrayExpression (elements) {
  return {
    type: 'ArrayExpression',
    elements
  }
}

function createCallExpression (callee, arguments) {
  return {
    type: 'CallExpression',
    callee: createIdentifier(callee),
    arguments
  }
}

function generate (node) {
  const context = {
    // 存储最终生成的渲染函数代码
    code: '',
    // 在生成代码时，通过调用push函数完成代码拼接
    push(code) {
      context.code += code
    },
    // 当前锁进级别，初始值为0，即没有缩进
    currentIndent: 0,
    // 该函数用来换行，即在代码字符串的后面追加\n字符
    // 另外，换行时应该保留缩紧，所以我们还要追加currrentIndent * 2 个空格字符
    newline() {
      context.code += '\n' + `  `.repeat(context.currentIndent)
    },
    // 缩进，让currentIndent自增后，调用换行函数
    indent () {
      context.currentIndent++
      context.newline()
    },
    // 取消缩进
    deIndent () {
      context.currentIndent--
      context.newline()
    }
  }
  // 调用genNode函数完成代码生成
  genNode (node, context)
  console.log(node, 'node')
  // 返回渲染函数代码
  return context.code
}

function genNode (node, context) {
  switch (node.type) {
    case 'FunctionDecl':
      genFunctionDecl(node, context)
      break
    case 'ReturnStatement':
      genReturnStatement(node, context)
      break
    case 'CallExpression':
      genCallExpression(node, context)
      break
    case 'StringLiteral':
      genStringLiteral(node, context)
      break
    case 'ArrayExpression':
      genArrayExpression(node, context)
      break
  }
}

function genFunctionDecl (node, context) {
  // 从context取出工具函数
  const { push, indent, deIndent } = context
  push(`function ${node.id.name} `)
  push(`(`)
  // 调用genNodeList为函数的参数生成代码
  genNodeList(node.params, context)
  push(`) `)
  push(`{`)
  // 缩进
  indent()
  // 为函数体生成代码，这里递归调用genNode函数
  node.body.forEach(n => genNode(n, context))
  // 取消缩进
  deIndent()
  push(`}`)
}

function genArrayExpression (node, context) {
  const { push } = context
  // 追加方括号
  push(`[`)
  // 调用genNodeList为元素生成代码
  genNodeList(node.elements, context)
  // 补全放括号
  push(`]`)
}

function genReturnStatement (node, context) {
  const { push } = context
  push(`return `)
  genNode(node.return, context)
}

function genStringLiteral (node, context) {
  const { push } = context
  push(`${node.value}`)
}

function genCallExpression (node, context) {
  const { push } = context
  // 取得被调用函数名称和参数列表
  const { callee, arguments: args } = node
  // 生成函数调用代码
  push(`${callee.name}(`)
  genNodeList(args, context)
  push(`)`)
}

function genNodeList (nodes, context) {
  const { push } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    genNode(node, context)
    if (i < nodes.length - 1) {
      push(`, `)
    }
  }
}

const p = '<div><p>Vue</p><p>Template</p></div>'

function compile (template) {
  // 模版AST
  const ast = parse(template)
  // 将模版AST转为javascriptAST
  transform(ast)
  console.log('--------')
  console.log(JSON.stringify(ast.jsNode, null, 2))
  console.log('--------')
  // console.log(JSON.stringify(ast, null, 2), 'ast')
  // 生成代码
  const code = generate(ast.jsNode)
  console.log(code, 'code')
  return code
}
compile(p)
// const ast = parse(p)
// transform(ast)
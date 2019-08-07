// 模板编译
class Compile {
  constructor(el, vm) {
    this.$vm = vm;
    this.$el = document.querySelector(el);
    // 先取出
    this.$fragment = this.node2Fragment(this.$el);
    // 再编译
    this.compile(this.$fragment);
    // 最后放回
    this.$el.appendChild(this.$fragment);
    this.$destroyEvents = [];
  }
  node2Fragment(el) {
    // 创建文档片段，存在于内存中，节点变化，不会造成DOM的回流
    const fragment = document.createDocumentFragment();
    let child;
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }
    return fragment;
  }
  destroy() {
    this.$destroyEvents.forEach(destroyEvent => destroyEvent());
  }
  // 编译模板
  compile(el) {
    const childNodes = el.childNodes;
    Array.from(childNodes).forEach(node => {
      if (node.nodeType === 1) {
        this.compileElement(node);
      } else if (this.isInter(node)) {
        this.compileText(node);
      }

      if (node.children && node.childNodes.length) {
        this.compile(node);
      }
    })
  }
  // 编译文本节点
  compileText(node) {
    // 表达式
    const exp = RegExp.$1;
    this.update(node, exp, 'text'); // 等同于v-test 在这里把指令提取出来
  }

  // 这里初始化和创建依赖收集器
  update(node, exp, dir) {
    const updater = this[`${dir}Updater`];
    if (updater) {
      // 初始化
      updater(node, this.$vm[exp]);
    }
    // 创建依赖收集
    new Watcher(this.$vm, exp, function(value) {
      // 依赖收集回调
      if (updater) {
        updater(node, value);
      }
    });
  }

  textUpdater(node, value) {
    node.textContent = value;
  }

  modelUpdater(node, value) {
    node.value = value;
  }

  // 编译元素
  compileElement(node) {
    const nodeAttrs = node.attributes;
    Array.from(nodeAttrs).forEach(attr => {
      const attrName = attr.name;
      const exp = attr.value;
      if (attrName.indexOf('k-') === 0) {
        const dir = attrName.substring(2);
        if (this[dir]) {
          this[dir](node, exp);
        }
      }
      if (attrName.indexOf('@') === 0) {
        const dir = attrName.substring(1);
        if (this.$vm[exp]) {
          node.addEventListener(dir, this.$vm[exp])
        }
      }
    })
  }
  addEventListener(node, type, cb) {
    node.addEventListener(type, cb);
    return () => {
      node.removeEventListener(type, cb);
    }
  }
  text(node, exp) {
    this.update(node, exp, 'text');
  }
  model(node, exp) {
    this.update(node, exp, 'model');
    const event = this.addEventListener(node, 'input', e => {
      const value = e.target.value;
      this.$vm[exp] = value;
    });
    this.$destroyEvents.push(event);
  }
  // 文本节点 且是可编译
  isInter(node) {
    return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent);
  }
}

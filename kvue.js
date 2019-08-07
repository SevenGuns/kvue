// Vue类
class KVue {
  constructor(options) {
    this.$options = options;
    this.$data = options.data;
    // 先代理属性
    this.proxyMethods(options.methods);
    this.observe(this.$data);
    // 然后编译模板
    this.$compile = new Compile(options.el, this);
    if (options.created) {
      options.created.call(this);
    }
  }

  destroy() {
    this.$compile.destroy();
    if (this.$options.destroyed) {
      this.$options.destroyed.call(this);
    }
  }

  proxyMethods(methods) {
    Object.keys(methods).forEach(key => {
      Object.defineProperty(this, key, {
        get() {
          return methods[key].bind(this);
        }
      })
    })
  }
  // 将data的属性代理到this上
  proxyData(key) {
    /**
     * FIXME: observe存在递归，如果data属性不存在会怎样？
     *  1. 如果属性不存在，'{ bar: '11', foo: { bar: '12' } }' foo内部的bar 会覆盖 $data上的bar
     *  2. 只需要将$data上的属性代理到this即可
     */
    Object.defineProperty(this, key, {
      get() {
        return this.$data[key];
      },
      set(newVal) {
        this.$data[key] = newVal;
      }
    });
  }
  // 遍历属性设置监听
  observe(value) {
    if (!value || typeof value !== 'object') {
      return;
    }
    Object.keys(value).forEach(key => {
      this.defineReactive(value, key, value[key]);
      this.proxyData(key);
    });
  }
  // 设置监听器
  // 数组如何监听？？
  defineReactive(obj, key, value) {
    // 递归设置监听
    this.observe(value);

    // 为每一个key添加Dep，key和dep有一一对应的关系
    const dep = new Dep();

    Object.defineProperty(obj, key, {
      get() {
        // TODO: 发现依赖
        // 依赖收集
        if (Dep.target) {
          // 其实就是一对多的关系 一个属性可能存在多个依赖
          // 通过时间订阅发布来一一通知
          // 但是这里的Dep.targe是取巧了
          // 它的调用顺序是：解析模板、发现依赖、通过访问属性自动完成依赖收集
          // 所以这里有个前提：1. 属性必须提前声明，也就是在初始化的时候添加observer
          dep.addDep(Dep.target);
        }
        return value;
      },
      set(newValue) {
        if (newValue !== value) {
          value = newValue;
          // 通知dep dep触发所有watcher更新
          dep.notify();
        }
      }
    });
  }
}

// Dep 用于收集dependencies 管理所有的Watcher
// 事件订阅发布模式
class Dep {
  constructor() {
    this.deps = [];
  }
  // dep是Watcher的实例
  addDep(watcher) {
    this.deps.push(watcher);
  }
  notify() {
    this.deps.forEach(dep => dep.update());
  }
}

// 创建Watcher: 保存data数值和页面中的挂钩关系
class Watcher {
  // 创建实例时立刻将该实例指向Dep.target便于依赖收集
  // TODO: 这一部分其实不是特别理解：1. Dep.target 2. Watcher的抽象
  constructor(vm, key, cb) {
    this.vm = vm;
    this.key = key;
    this.cb = cb;
    // 在模板中每发现一个依赖就会创建一个watcher，然后读取key，读取的时候正好就是刚刚创建的watcher
    // 一个Dep可能有多个watcher
    Dep.target = this;
    // 自动触发依赖收集
    this.vm[key];
    Dep.target = null;
  }

  // 更新
  update() {
    // 这里的key用于触发回调回传value
    this.cb.call(this.vm, this.vm[this.key]);
  }
}

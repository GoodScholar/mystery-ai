/**
 * 简单的 Hash-based SPA 路由器
 */
export class Router {
  constructor(app) {
    this.app = app
    this.routes = {}
    this.currentPage = null

    window.addEventListener('hashchange', () => this.resolve())
  }

  /** 注册路由 */
  on(path, handler) {
    this.routes[path] = handler
    return this
  }

  /** 导航到指定路由 */
  navigate(path) {
    window.location.hash = path
  }

  /** 解析当前路由 */
  async resolve() {
    const rawHash = window.location.hash.slice(1) || '/'
    // 分离路径和查询参数
    const [path] = rawHash.split('?')
    const handler = this.routes[path] || this.routes['/']

    if (!handler) return

    // 退出动画
    if (this.currentPage) {
      this.app.classList.add('page-exit')
      await new Promise(r => setTimeout(r, 200))
      this.app.classList.remove('page-exit')
    }

    // 渲染新页面
    const html = await handler()
    this.app.innerHTML = html
    this.app.classList.add('page')
    this.currentPage = path

    // 触发页面初始化事件（使用干净的路径）
    window.dispatchEvent(new CustomEvent('page:mounted', { detail: { path } }))

    // 移除动画类（下次切换时重新添加）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.app.classList.remove('page')
      })
    })
  }

  /** 启动路由 */
  start() {
    this.resolve()
  }
}

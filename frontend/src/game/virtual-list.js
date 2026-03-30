export class VirtualList {
  constructor(containerId, options) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.items = options.items || [];
    this.renderItem = options.renderItem;
    this.estimatedItemHeight = options.estimatedItemHeight || 80;
    this.buffer = options.buffer || 5;

    this.itemHeights = new Array(this.items.length).fill(this.estimatedItemHeight);
    this.itemPositions = [];
    this.renderedDomMap = new Map();

    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    this.scroller = document.createElement('div');
    this.container.innerHTML = '';
    this.container.appendChild(this.scroller);

    this.resizeObserver = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const idx = Number(entry.target.dataset.idx);
        if (!isNaN(idx)) {
          const height = entry.borderBoxSize ? entry.borderBoxSize[0].blockSize : entry.contentRect.height;
          if (this.itemHeights[idx] !== height && height > 0) {
            this.itemHeights[idx] = height;
            changed = true;
          }
        }
      }
      if (changed) {
        this.updatePositions();
        this.render();
      }
    });

    this.container.addEventListener('scroll', () => {
      requestAnimationFrame(() => this.render());
    });

    this.container.addEventListener('resize', () => {
      requestAnimationFrame(() => this.render());
    });

    this.updatePositions();
    this.render();
  }

  setItems(newItems) {
    this.items = newItems;
    this.itemHeights = new Array(this.items.length).fill(this.estimatedItemHeight);
    this.renderedDomMap.forEach(dom => this.resizeObserver.unobserve(dom));
    this.renderedDomMap.clear();
    this.scroller.innerHTML = '';
    this.updatePositions();
    this.render();
  }

  appendItem(item) {
    this.items.push(item);
    this.itemHeights.push(this.estimatedItemHeight);
    this.updatePositions();
    this.render();
    this.scrollToBottom();
  }

  updateItemHeight(index) {
     const dom = this.renderedDomMap.get(index);
     if(dom) {
         const h = dom.getBoundingClientRect().height;
         if(h && h !== this.itemHeights[index]) {
            this.itemHeights[index] = h;
            this.updatePositions();
            this.render();
         }
     }
  }

  updatePositions() {
    this.itemPositions = [0];
    let totalHeight = 0;
    for (let i = 0; i < this.items.length; i++) {
      totalHeight += this.itemHeights[i];
      this.itemPositions.push(totalHeight);
    }
    this.scroller.style.height = totalHeight + 'px';
  }

  render() {
    const scrollTop = this.container.scrollTop;
    const clientHeight = this.container.clientHeight;

    // 二分查找可视起点
    let startIdx = 0;
    let endIdx = this.items.length - 1;

    let low = 0, high = this.items.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.itemPositions[mid] <= scrollTop) {
        startIdx = mid;
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    // 确定可视终点
    for (let i = startIdx; i < this.items.length; i++) {
      if (this.itemPositions[i] > scrollTop + clientHeight) {
        endIdx = i;
        break;
      }
    }

    startIdx = Math.max(0, startIdx - this.buffer);
    endIdx = Math.min(this.items.length - 1, endIdx + this.buffer);

    // 回收看不见的 DOM
    for (const [idx, dom] of this.renderedDomMap.entries()) {
      if (idx < startIdx || idx > endIdx) {
        this.resizeObserver.unobserve(dom);
        this.scroller.removeChild(dom);
        this.renderedDomMap.delete(idx);
      }
    }

    // 渲染能看见的 DOM
    for (let i = startIdx; i <= endIdx; i++) {
      if (!this.renderedDomMap.has(i)) {
        const dom = this.renderItem(this.items[i], i);
        dom.style.position = 'absolute';
        dom.style.top = '0';
        dom.style.left = '0';
        dom.style.right = '0';
        dom.style.transform = `translateY(${this.itemPositions[i]}px)`;
        dom.dataset.idx = i;
        
        this.scroller.appendChild(dom);
        this.resizeObserver.observe(dom);
        this.renderedDomMap.set(i, dom);
      } else {
        // 更新位置 (如果前面的高度发生变化)
        const dom = this.renderedDomMap.get(i);
        dom.style.transform = `translateY(${this.itemPositions[i]}px)`;
      }
    }
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      this.container.scrollTop = this.container.scrollHeight;
    });
  }
}

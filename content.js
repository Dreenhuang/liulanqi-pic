(function() {
  'use strict';
  
  console.log('[图片浏览助手] 内容脚本开始执行');

  let images = [];
  let currentIndex = 0;
  let viewer = null;
  let viewerImg = null;
  let counter = null;
  let prevBtn = null;
  let nextBtn = null;
  let isLoadingNextPage = false;
  let currentPageNum = 1;
  let baseUrl = '';
  let preloadedPages = [];
  let isFullscreen = false;
  let currentZoom = 1;
  let zoomLevel = null;
  let isDragging = false;
  let dragStartX, dragStartY, scrollStartX, scrollStartY;
  let floatingBtn = null;

  function createFloatingButton() {
    console.log('[图片浏览助手] 尝试创建悬浮按钮, body存在:', !!document.body);
    if (floatingBtn) {
      console.log('[图片浏览助手] 悬浮按钮已存在');
      return;
    }
    
    floatingBtn = document.createElement('div');
    floatingBtn.id = 'image-viewer-float-btn';
    floatingBtn.innerHTML = '🖼';
    floatingBtn.title = '打开图片查看器 (Ctrl+0)';
    floatingBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:50px;height:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:2147483647;box-shadow:0 4px 15px rgba(102,126,234,0.4);user-select:none;';
    
    let dragOffsetX, dragOffsetY;
    
    floatingBtn.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffsetX = e.clientX - floatingBtn.getBoundingClientRect().left;
      dragOffsetY = e.clientY - floatingBtn.getBoundingClientRect().top;
      floatingBtn.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        floatingBtn.style.left = (e.clientX - dragOffsetX) + 'px';
        floatingBtn.style.top = (e.clientY - dragOffsetY) + 'px';
        floatingBtn.style.bottom = 'auto';
        floatingBtn.style.right = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        floatingBtn.style.cursor = 'pointer';
      }
    });
    
    floatingBtn.addEventListener('click', (e) => {
      if (!isDragging) {
        e.stopPropagation();
        toggleViewer();
      }
    });
    
    document.body.appendChild(floatingBtn);
    console.log('[图片浏览助手] 悬浮按钮已添加到页面');
  }

  function getViewerCSS() {
    return `
#image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  z-index: 999999;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#image-viewer-overlay .viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: zoom-in;
}
#image-viewer-overlay .viewer-prev,
#image-viewer-overlay .viewer-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 100px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 36px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
#image-viewer-overlay .viewer-prev {
  left: 20px;
  border-radius: 0 8px 8px 0;
}
#image-viewer-overlay .viewer-next {
  right: 20px;
  border-radius: 8px 0 0 8px;
}
#image-viewer-overlay .viewer-prev:hover,
#image-viewer-overlay .viewer-next:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-50%) scale(1.1);
}
#image-viewer-overlay .viewer-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}
#image-viewer-overlay .viewer-image {
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  transition: transform 0.15s ease;
  cursor: zoom-in;
  flex-shrink: 0;
}
#image-viewer-overlay .viewer-image.zoomed {
  max-width: none;
  max-height: none;
  cursor: grab;
}
#image-viewer-overlay .viewer-image.dragging {
  cursor: grabbing;
}
#image-viewer-overlay.fullscreen-mode .viewer-footer {
  position: fixed;
  top: 10px;
  left: 10px;
  right: auto;
  bottom: auto;
  background: transparent;
  padding: 0;
  z-index: 1000000;
}
#image-viewer-overlay.fullscreen-mode .viewer-counter,
#image-viewer-overlay.fullscreen-mode .viewer-zoom-controls {
  display: none;
}
#image-viewer-overlay.fullscreen-mode .viewer-cache-status {
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 12px;
  font-size: 14px;
}
#image-viewer-overlay.fullscreen-mode .viewer-body {
  height: 100vh;
}
#image-viewer-overlay.fullscreen-mode .viewer-container {
  max-height: 100vh;
}
#image-viewer-overlay.fullscreen-mode .viewer-image {
  max-width: 100vw;
  max-height: 100vh;
}
#image-viewer-overlay .viewer-footer {
  padding: 10px 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#image-viewer-overlay .viewer-counter {
  color: white;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 15px;
  border-radius: 20px;
}
#image-viewer-overlay .viewer-cache-status {
  color: #fbbf24;
  font-size: 13px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 12px;
  cursor: help;
}
#image-viewer-overlay .viewer-zoom-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}
#image-viewer-overlay .zoom-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
#image-viewer-overlay .zoom-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
#image-viewer-overlay .zoom-level {
  color: white;
  font-size: 14px;
  min-width: 50px;
  text-align: center;
}
#image-viewer-overlay .viewer-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 18px;
  background: rgba(0,0,0,0.7);
  padding: 20px 40px;
  border-radius: 10px;
  z-index: 100;
}
#image-viewer-overlay .viewer-size {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 10px;
}
`;
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
    if (isFullscreen) {
      viewer.classList.add('fullscreen-mode');
    } else {
      viewer.classList.remove('fullscreen-mode');
    }
  }

  function enterFullscreen() {
    isFullscreen = true;
    if (viewer) {
      viewer.classList.add('fullscreen-mode');
    }
  }

  function exitFullscreen() {
    isFullscreen = false;
    if (viewer) {
      viewer.classList.remove('fullscreen-mode');
    }
  }

  function isValidImageUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    const invalidPatterns = ['icon', 'logo', 'avatar', 'button', 'loading', 'thumb', 'small', 'banner', 'ad', 'gif'];
    for (const pattern of invalidPatterns) {
      if (lower.includes(pattern)) return false;
    }
    return /\.(jpg|jpeg|png|webp|bmp)(\?.*)?$/i.test(lower);
  }

  function extractImagesQuick() {
    const collected = [];
    const seen = new Set();
    const MIN_WIDTH = 600;
    const MIN_HEIGHT = 600;

    document.querySelectorAll('img').forEach(img => {
      let src = img.src || img.dataset.src || img.dataset.original;
      if (!src || seen.has(src)) return;
      
      if (img.naturalWidth >= MIN_WIDTH && img.naturalHeight >= MIN_HEIGHT) {
        seen.add(src);
        collected.push({ 
          src: src, 
          width: img.naturalWidth, 
          height: img.naturalHeight 
        });
      }
    });

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      if (!href || seen.has(href)) return;
      if (isValidImageUrl(href)) {
        seen.add(href);
        collected.push({ src: href, width: 0, height: 0 });
      }
    });

    return collected;
  }

  function findNextPageLink() {
    const url = window.location.href;
    console.log('[图片浏览助手] findNextPageLink URL:', url);
    
    const lastSlashIndex = url.lastIndexOf('/');
    const pathPrefix = url.substring(0, lastSlashIndex + 1);
    const filename = url.substring(lastSlashIndex + 1);
    console.log('[图片浏览助手] pathPrefix:', pathPrefix, 'filename:', filename);
    
    const underMatch = filename.match(/^(.+)_(\d+)\.html?$/);
    if (underMatch) {
      baseUrl = pathPrefix + underMatch[1];
      currentPageNum = parseInt(underMatch[2]);
      console.log('[图片浏览助手] 匹配下划线格式: baseUrl=', baseUrl, 'pageNum=', currentPageNum);
      return;
    }
    
    const simpleMatch = filename.match(/^(.+)\.html?$/);
    if (simpleMatch) {
      baseUrl = pathPrefix + simpleMatch[1];
      currentPageNum = 1;
      console.log('[图片浏览助手] 匹配简单格式: baseUrl=', baseUrl, 'pageNum=', currentPageNum);
      return;
    }
    
    baseUrl = url.replace(/\.[^\/]+$/, '');
    currentPageNum = 1;
    console.log('[图片浏览助手] 默认: baseUrl=', baseUrl, 'pageNum=', currentPageNum);
  }

  function buildNextPageUrl(base, pageNum) {
    let nextUrl;
    if (pageNum === 1) {
      nextUrl = `${base}.html`;
    } else {
      nextUrl = `${base}_${pageNum}.html`;
    }
    console.log('[图片浏览助手] buildNextPageUrl: base=', base, 'pageNum=', pageNum, 'result=', nextUrl);
    return nextUrl;
  }

  async function fetchPageImages(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const newImages = [];
      const seen = new Set(images.map(img => img.src));
      const MIN_WIDTH = 600;
      const MIN_HEIGHT = 600;
      
      const imgElements = doc.querySelectorAll('img');
      const loadPromises = [];
      
      imgElements.forEach(img => {
        let src = img.src || img.dataset.src || img.dataset.original;
        if (!src || seen.has(src)) return;
        
        const promise = new Promise((resolve) => {
          const tempImg = new Image();
          tempImg.onload = () => {
            if (tempImg.naturalWidth >= MIN_WIDTH && tempImg.naturalHeight >= MIN_HEIGHT) {
              resolve({ src: src, width: tempImg.naturalWidth, height: tempImg.naturalHeight });
            } else {
              resolve(null);
            }
          };
          tempImg.onerror = () => resolve(null);
          tempImg.src = src;
        });
        loadPromises.push(promise);
      });
      
      const results = await Promise.all(loadPromises);
      results.forEach(result => {
        if (result) {
          newImages.push(result);
        }
      });
      
      return newImages;
    } catch (e) {
      console.error('[图片浏览助手] 获取页面失败:', e);
      return [];
    }
  }

  let isPreloading = false;
  let hasMorePages = true;
  let maxPreloadedPage = 0;
  let cacheStatusEl = null;

  function updateCacheStatus(loading = false, pageNum = 0) {
    if (!cacheStatusEl) return;
    const cachedCount = preloadedPages.length;
    const totalImages = preloadedPages.reduce((sum, p) => sum + p.images.length, 0);
    
    if (loading && pageNum > 0) {
      cacheStatusEl.textContent = `缓存中: 第${pageNum}页...`;
      cacheStatusEl.style.color = '#fbbf24';
    } else if (cachedCount > 0) {
      const pageList = preloadedPages.map(p => `P${p.pageNum}(${p.images.length}张)`).join(' ');
      cacheStatusEl.textContent = `已缓存: ${cachedCount}页/${totalImages}张`;
      cacheStatusEl.title = pageList;
      cacheStatusEl.style.color = '#4ade80';
    } else {
      cacheStatusEl.textContent = '缓存: 准备中...';
      cacheStatusEl.style.color = '#fbbf24';
    }
  }

  async function preloadPages() {
    if (!baseUrl || isPreloading) return;
    
    isPreloading = true;
    let preloadPageNum = maxPreloadedPage > 0 ? maxPreloadedPage + 1 : currentPageNum + 1;
    
    while (hasMorePages) {
      const url = buildNextPageUrl(baseUrl, preloadPageNum);
      
      if (preloadedPages.some(p => p.pageNum === preloadPageNum)) {
        preloadPageNum++;
        continue;
      }
      
      updateCacheStatus(true, preloadPageNum);
      
      console.log('[图片浏览助手] 预加载第', preloadPageNum, '页:', url);
      const newImages = await fetchPageImages(url);
      
      if (newImages.length > 0) {
        preloadedPages.push({ 
          url: url, 
          pageNum: preloadPageNum,
          images: newImages 
        });
        maxPreloadedPage = preloadPageNum;
        console.log('[图片浏览助手] 预加载完成: 第', preloadPageNum, '页', newImages.length, '张');
        updateCacheStatus();
        
        for (const img of newImages) {
          new Image().src = img.src;
        }
        
        preloadPageNum++;
      } else {
        hasMorePages = false;
        console.log('[图片浏览助手] 没有更多页面了');
        if (cacheStatusEl) {
          cacheStatusEl.textContent = '缓存: 已完成';
        }
        break;
      }
    }
    
    isPreloading = false;
  }

  async function loadNextPage() {
    if (isLoadingNextPage) return { success: false, firstNewIndex: -1 };
    
    isLoadingNextPage = true;
    showLoading('正在加载下一页...');
    
    const nextPage = currentPageNum + 1;
    let newImages = [];
    let firstNewIndex = images.length;
    
    const preloaded = preloadedPages.find(p => p.pageNum === nextPage);
    
    if (preloaded) {
      console.log('[图片浏览助手] 使用预加载数据');
      newImages = preloaded.images;
      preloadedPages = preloadedPages.filter(p => p.pageNum !== nextPage);
      updateCacheStatus();
    } else {
      const urlToLoad = buildNextPageUrl(baseUrl, nextPage);
      console.log('[图片浏览助手] 加载URL:', urlToLoad);
      newImages = await fetchPageImages(urlToLoad);
    }
    
    if (newImages.length > 0) {
      images = images.concat(newImages);
      currentPageNum = nextPage;
      showStatus(`已加载第${currentPageNum}页 (${newImages.length}张)`);
      console.log('[图片浏览助手] 加载成功, 总图片:', images.length, 'newImages:', newImages.length);
    } else {
      showStatus('没有更多图片了');
      console.log('[图片浏览助手] 没有更多图片');
    }
    
    hideLoading();
    isLoadingNextPage = false;
    
    return { 
      success: newImages.length > 0, 
      firstNewIndex: newImages.length > 0 ? firstNewIndex : -1 
    };
  }

  function showStatus(text) {
    let status = document.getElementById('image-viewer-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'image-viewer-status';
      status.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(102, 126, 234, 0.9);
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 1000000;
      `;
      document.body.appendChild(status);
    }
    status.textContent = text;
    setTimeout(() => status.remove(), 1500);
  }

  function showLoading(text) {
    let loading = document.getElementById('image-viewer-loading');
    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'image-viewer-loading';
      loading.className = 'viewer-loading';
      viewer.querySelector('.viewer-body').appendChild(loading);
    }
    loading.textContent = text;
    loading.style.display = 'block';
  }

  function hideLoading() {
    const loading = document.getElementById('image-viewer-loading');
    if (loading) loading.style.display = 'none';
  }

  function updateCounter() {
    if (images.length === 0) return;
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
  }

  async function showImage(index) {
    if (images.length === 0) return;
    
    if (index >= images.length) {
      const result = await loadNextPage();
      if (result.success && result.firstNewIndex >= 0) {
        index = result.firstNewIndex;
        console.log('[图片浏览助手] 跳转到新图片, index:', index, 'src:', images[index].src);
      } else {
        index = images.length - 1;
      }
    }
    
    if (index < 0) index = 0;
    if (index >= images.length) index = images.length - 1;
    
    currentIndex = index;
    const newSrc = images[currentIndex].src;
    console.log('[图片浏览助手] 显示图片:', currentIndex, newSrc);
    
    viewerImg.style.opacity = '0.5';
    viewerImg.onload = function() {
      viewerImg.style.opacity = '1';
    };
    viewerImg.onerror = function() {
      console.error('[图片浏览助手] 图片加载失败:', newSrc);
      viewerImg.style.opacity = '1';
    };
    viewerImg.src = newSrc;
    updateCounter();
    
    currentZoom = 1;
    viewerImg.style.transform = 'scale(1)';
    viewerImg.classList.remove('zoomed');
    if (zoomLevel) {
      zoomLevel.textContent = '100%';
    }
  }

  function closeViewer() {
    if (viewer) {
      if (isFullscreen) {
        exitFullscreen();
      }
      viewer.remove();
      viewer = null;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeydown);
    }
  }

  async function handleKeydown(e) {
    if (!viewer) return;
    
    switch(e.key) {
      case 'ArrowLeft':
        await showImage(currentIndex - 1);
        break;
      case 'ArrowRight':
        await showImage(currentIndex + 1);
        break;
      case 'Escape':
        closeViewer();
        break;
      case ' ':
        e.preventDefault();
        const result = await loadNextPage();
        if (result.success && result.firstNewIndex >= 0) {
          currentIndex = result.firstNewIndex;
          const newSrc = images[currentIndex].src;
          console.log('[图片浏览助手] 空格加载, 显示图片:', currentIndex, newSrc);
          
          viewerImg.style.opacity = '0.5';
          viewerImg.onload = function() {
            viewerImg.style.opacity = '1';
          };
          viewerImg.onerror = function() {
            console.error('[图片浏览助手] 图片加载失败:', newSrc);
            viewerImg.style.opacity = '1';
          };
          viewerImg.src = newSrc;
          updateCounter();
          
          currentZoom = 1;
          viewerImg.style.transform = 'scale(1)';
          viewerImg.classList.remove('zoomed');
          if (zoomLevel) {
            zoomLevel.textContent = '100%';
          }
        }
        break;
    }
  }

  function initViewer() {
    console.log('[图片浏览助手] 初始化查看器...');
    
    images = extractImagesQuick();
    
    if (images.length === 0) {
      alert('未找到大尺寸图片（需要宽度和高度均超过600像素）');
      return;
    }

    findNextPageLink();

    const style = document.createElement('style');
    style.textContent = getViewerCSS();
    document.head.appendChild(style);

    viewer = document.createElement('div');
    viewer.id = 'image-viewer-overlay';
    viewer.innerHTML = `
      <div class="viewer-body">
        <button class="viewer-prev">&#10094;</button>
        <div class="viewer-container">
          <img class="viewer-image" src="${images[0].src}" alt="图片">
        </div>
        <button class="viewer-next">&#10095;</button>
      </div>
      <div class="viewer-footer">
        <span class="viewer-counter">1 / ${images.length}</span>
        <span class="viewer-cache-status">缓存: 准备中...</span>
        <div class="viewer-zoom-controls">
          <button class="zoom-btn" id="zoom-out">−</button>
          <span class="zoom-level">100%</span>
          <button class="zoom-btn" id="zoom-in">+</button>
          <button class="zoom-btn" id="zoom-fit">⊡</button>
        </div>
      </div>
    `;

    document.body.appendChild(viewer);
    document.body.style.overflow = 'hidden';

    viewerImg = viewer.querySelector('.viewer-image');
    counter = viewer.querySelector('.viewer-counter');
    cacheStatusEl = viewer.querySelector('.viewer-cache-status');
    prevBtn = viewer.querySelector('.viewer-prev');
    nextBtn = viewer.querySelector('.viewer-next');
    
    enterFullscreen();
    
    const zoomInBtn = viewer.querySelector('#zoom-in');
    const zoomOutBtn = viewer.querySelector('#zoom-out');
    const zoomFitBtn = viewer.querySelector('#zoom-fit');
    zoomLevel = viewer.querySelector('.zoom-level');
    const container = viewer.querySelector('.viewer-container');
    
    function updateZoom(newZoom) {
      currentZoom = Math.max(0.1, Math.min(10, newZoom));
      viewerImg.style.transform = `scale(${currentZoom})`;
      zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
      
      if (currentZoom > 1) {
        viewerImg.classList.add('zoomed');
      } else {
        viewerImg.classList.remove('zoomed');
      }
    }
    
    zoomInBtn.addEventListener('click', () => updateZoom(currentZoom * 1.25));
    zoomOutBtn.addEventListener('click', () => updateZoom(currentZoom / 1.25));
    zoomFitBtn.addEventListener('click', () => updateZoom(1));
    
    container.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        updateZoom(currentZoom * delta);
      }
    }, { passive: false });
    
    viewerImg.addEventListener('mousedown', (e) => {
      if (currentZoom > 1) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        scrollStartX = container.scrollLeft;
        scrollStartY = container.scrollTop;
        viewerImg.classList.add('dragging');
        e.preventDefault();
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = dragStartX - e.clientX;
        const dy = dragStartY - e.clientY;
        container.scrollLeft = scrollStartX + dx;
        container.scrollTop = scrollStartY + dy;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        viewerImg.classList.remove('dragging');
      }
    });
    
    viewerImg.addEventListener('click', () => {
      if (currentZoom === 1) {
        updateZoom(2);
      } else {
        updateZoom(1);
      }
    });

    prevBtn.addEventListener('click', async () => await showImage(currentIndex - 1));
    nextBtn.addEventListener('click', async () => await showImage(currentIndex + 1));
    document.addEventListener('keydown', handleKeydown);

    for (let i = 0; i < Math.min(5, images.length); i++) {
      new Image().src = images[i].src;
    }

    updateCounter();
    
    preloadPages();
  }

  function toggleViewer() {
    console.log('[图片浏览助手] toggleViewer 被调用');
    const existingViewer = document.getElementById('image-viewer-overlay');
    if (existingViewer) {
      existingViewer.remove();
      viewer = null;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeydown);
    } else {
      initViewer();
    }
  }

  function tryCreateFloatingButton() {
    console.log('[图片浏览助手] tryCreateFloatingButton 调用, readyState:', document.readyState, 'body:', !!document.body);
    if (document.body) {
      createFloatingButton();
    } else {
      console.log('[图片浏览助手] body不存在，1秒后重试');
      setTimeout(tryCreateFloatingButton, 1000);
    }
  }
  
  console.log('[图片浏览助手] 当前状态: readyState=', document.readyState);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryCreateFloatingButton);
  } else {
    setTimeout(tryCreateFloatingButton, 100);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[图片浏览助手] 收到消息:', message);
      if (message.action === 'toggleViewer') {
        toggleViewer();
        sendResponse({ success: true });
      }
      return true;
    });
  }

  console.log('[图片浏览助手] 内容脚本已加载');
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('[图片浏览助手] 页面加载完成, 尝试创建悬浮按钮');
      if (!floatingBtn) {
        createFloatingButton();
      }
    }, 500);
  });
  
  window.toggleViewer = toggleViewer;
})();

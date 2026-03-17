(function() {
  'use strict';

  let images = [];
  let currentIndex = 0;
  let viewer = null;
  let viewerImg = null;
  let prevBtn = null;
  let nextBtn = null;
  let closeBtn = null;
  let counter = null;
  let isAutoLoading = false;
  let autoNextEnabled = false;

  function initViewer() {
    console.log('[图片浏览助手] 初始化查看器...');
    images = extractImages();
    console.log('[图片浏览助手] 找到图片数量:', images.length);
    
    if (images.length === 0) {
      alert('未找到图片，请确认页面包含图片内容');
      return;
    }

    currentIndex = 0;
    createViewerUI();
    showImage(0);
    preloadImages();
    initAutoNextPage();
  }

  function extractImages() {
    const collected = [];
    const seen = new Set();

    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.dataset.src || img.dataset.original || img.getAttribute('data-src') || img.getAttribute('src2');
      if (!src || seen.has(src)) return;
      
      const naturalWidth = img.naturalWidth || img.width || parseInt(img.getAttribute('width')) || 0;
      const naturalHeight = img.naturalHeight || img.height || parseInt(img.getAttribute('height')) || 0;
      
      const srcLower = src.toLowerCase();
      const isSmallIcon = srcLower.includes('icon') && naturalWidth < 100 && naturalHeight < 100;
      const isBanner = srcLower.includes('banner') && naturalWidth < 200;
      
      if (isSmallIcon || isBanner) return;
      
      const minWidth = 150;
      const minHeight = 150;
      const isLargeEnough = naturalWidth >= minWidth || naturalHeight >= minHeight;
      
      const isImageFile = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(src);
      
      if (isLargeEnough || isImageFile) {
        seen.add(src);
        collected.push({ src: src, element: img });
      }
    });

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      if (!href || seen.has(href)) return;
      
      const ext = href.toLowerCase().split('.').pop().split('?')[0];
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        seen.add(href);
        collected.push({ src: href, element: link });
      }
    });

    return collected;
  }

  function createViewerUI() {
    viewer = document.createElement('div');
    viewer.id = 'image-viewer-overlay';
    viewer.innerHTML = `
      <div class="viewer-header">
        <span class="viewer-title">图片浏览</span>
        <span class="viewer-counter"></span>
        <button class="viewer-close">&times;</button>
      </div>
      <div class="viewer-body">
        <button class="viewer-prev">&#10094;</button>
        <div class="viewer-container">
          <img class="viewer-image" src="" alt="图片">
        </div>
        <button class="viewer-next">&#10095;</button>
      </div>
      <div class="viewer-footer">
        <span class="viewer-hint">← → 切换图片 | ESC 关闭 | 空格 自动翻页</span>
      </div>
    `;

    document.body.appendChild(viewer);
    document.body.style.overflow = 'hidden';

    viewerImg = viewer.querySelector('.viewer-image');
    counter = viewer.querySelector('.viewer-counter');
    prevBtn = viewer.querySelector('.viewer-prev');
    nextBtn = viewer.querySelector('.viewer-next');
    closeBtn = viewer.querySelector('.viewer-close');

    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
    closeBtn.addEventListener('click', closeViewer);

    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) closeViewer();
    });

    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!viewer) return;

    switch(e.key) {
      case 'ArrowLeft':
        prevImage();
        break;
      case 'ArrowRight':
        nextImage();
        break;
      case 'Escape':
        closeViewer();
        break;
      case ' ':
        e.preventDefault();
        autoNextPage();
        break;
    }
  }

  function showImage(index) {
    if (index < 0) index = 0;
    if (index >= images.length) index = images.length - 1;
    
    currentIndex = index;
    viewerImg.src = images[currentIndex].src;
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
    
    viewerImg.onload = () => {
      adjustImageSize();
    };
  }

  function adjustImageSize() {
    const maxWidth = window.innerWidth - 200;
    const maxHeight = window.innerHeight - 150;
    
    let width = viewerImg.naturalWidth;
    let height = viewerImg.naturalHeight;
    
    if (width > maxWidth) {
      height = height * (maxWidth / width);
      width = maxWidth;
    }
    
    if (height > maxHeight) {
      width = width * (maxHeight / height);
      height = maxHeight;
    }
    
    viewerImg.style.width = width + 'px';
    viewerImg.style.height = height + 'px';
  }

  function prevImage() {
    if (currentIndex > 0) {
      showImage(currentIndex - 1);
    }
  }

  function nextImage() {
    if (currentIndex < images.length - 1) {
      showImage(currentIndex + 1);
    }
  }

  function closeViewer() {
    if (viewer) {
      viewer.remove();
      viewer = null;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeydown);
      isAutoLoading = false;
      autoNextEnabled = false;
    }
  }

  function preloadImages() {
    for (let i = currentIndex; i < Math.min(currentIndex + 3, images.length); i++) {
      const img = new Image();
      img.src = images[i].src;
    }
  }

  function initAutoNextPage() {
    const observer = new MutationObserver((mutations) => {
      if (!isAutoLoading) return;
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const newImages = extractImages();
            const oldLength = images.length;
            newImages.forEach(img => {
              if (!images.find(item => item.src === img.src)) {
                images.push(img);
              }
            });
            
            if (images.length > oldLength) {
              counter.textContent = `${currentIndex + 1} / ${images.length}`;
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function autoNextPage() {
    autoNextEnabled = !autoNextEnabled;
    
    if (autoNextEnabled) {
      const nextLink = findNextPageLink();
      
      if (nextLink) {
        isAutoLoading = true;
        showAutoNextStatus('正在跳转到下一页...');
        
        setTimeout(() => {
          window.location.href = nextLink;
        }, 500);
      } else {
        const pageMatch = window.location.href.match(/(\d+)(\.[a-z]+)?\.html/);
        if (pageMatch) {
          const currentPage = parseInt(pageMatch[1]);
          const ext = pageMatch[2] || '.html';
          const nextUrl = window.location.href.replace(/(\d+)(\.[a-z]+)?\.html/, (currentPage + 1) + ext + '.html');
          
          if (nextUrl !== window.location.href) {
            isAutoLoading = true;
            showAutoNextStatus('正在跳转到下一页...');
            
            setTimeout(() => {
              window.location.href = nextUrl;
            }, 500);
          }
        } else {
          showAutoNextStatus('未找到下一页链接');
          autoNextEnabled = false;
        }
      }
    }
  }

  function findNextPageLink() {
    const linkTexts = ['下一页', '下一章', 'next page', 'next', '下一页», '下一', 'next >', '›', 'page next'];
    const linkSelectors = [
      'a.next', 'a.nextpage', 'a.page-next', 
      '.pagination a:last-child', '.page a:last-child',
      '.next-page a', '#next a', 
      'a[rel="next"]', 'a[href*="page"]'
    ];
    
    let candidates = [];
    
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent.toLowerCase().trim();
      const href = a.href;
      
      for (const pattern of linkTexts) {
        if (text.includes(pattern.toLowerCase())) {
          candidates.push({ element: a, href: href, priority: text === '下一页' || text === 'next' ? 1 : 2 });
          break;
        }
      }
    });
    
    for (const selector of linkSelectors) {
      try {
        document.querySelectorAll(selector).forEach(a => {
          if (a.href && !candidates.find(c => c.href === a.href)) {
            candidates.push({ element: a, href: a.href, priority: 3 });
          }
        });
      } catch(e) {}
    }
    
    candidates.sort((a, b) => a.priority - b.priority);
    
    return candidates.length > 0 ? candidates[0].href : null;
  }

  function showAutoNextStatus(message) {
    const status = document.createElement('div');
    status.id = 'auto-next-status';
    status.textContent = message;
    status.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(102, 126, 234, 0.9);
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 18px;
      z-index: 1000000;
    `;
    document.body.appendChild(status);
    
    setTimeout(() => status.remove(), 2000);
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

  window.addEventListener('initImageViewer', initViewer);

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
  
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'imagesUpdated') {
      images = event.data.images;
      if (viewer && counter) {
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
      }
    }
  });

  console.log('[图片浏览助手] 内容脚本已加载');
})();

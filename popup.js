document.getElementById('openViewer').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: tabs[0].id },
          css: getViewerCSS()
        });
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: toggleViewer
        });
        window.close();
      } catch (error) {
        console.error('执行脚本失败:', error);
        alert('无法执行脚本: ' + error.message);
      }
    }
  });
});

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
#image-viewer-overlay .viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
#image-viewer-overlay .viewer-title {
  font-size: 18px;
  font-weight: 600;
}
#image-viewer-overlay .viewer-counter {
  font-size: 16px;
  background: rgba(255, 255, 255, 0.2);
  padding: 5px 15px;
  border-radius: 20px;
}
#image-viewer-overlay .viewer-close {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
#image-viewer-overlay .viewer-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}
#image-viewer-overlay .viewer-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
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
  max-width: 90%;
  max-height: 80%;
}
#image-viewer-overlay .viewer-image {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
  transition: opacity 0.3s ease;
}
#image-viewer-overlay .viewer-footer {
  padding: 15px 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
}
#image-viewer-overlay .viewer-hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
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
}
#image-viewer-overlay .viewer-size {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 10px;
}
`;
}

function toggleViewer() {
  const existingViewer = document.getElementById('image-viewer-overlay');
  if (existingViewer) {
    existingViewer.remove();
    return;
  }

  const MIN_WIDTH = 800;
  const MIN_HEIGHT = 800;
  let images = [];
  const seen = new Set();
  let currentIndex = 0;
  let viewer, viewerImg, counter, prevBtn, nextBtn, closeBtn, sizeInfo, titleSpan;
  let isLoadingNextPage = false;
  let currentPageNum = 1;
  let baseUrl = '';

  function isValidImageUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    const invalidPatterns = ['icon', 'logo', 'avatar', 'button', 'loading', 'thumb', 'small', 'banner', 'ad', 'gif'];
    for (const pattern of invalidPatterns) {
      if (lower.includes(pattern)) return false;
    }
    return /\.(jpg|jpeg|png|webp|bmp)(\?.*)?$/i.test(lower);
  }

  function extractImagesFromDoc(doc) {
    const collected = [];
    
    doc.querySelectorAll('img').forEach(img => {
      let src = img.src || img.dataset.src || img.dataset.original || 
                img.getAttribute('data-src') || img.getAttribute('src2') || 
                img.getAttribute('lay-src') || img.getAttribute('data-img');
      
      if (!src || seen.has(src)) return;
      if (!isValidImageUrl(src)) return;
      
      let width = img.naturalWidth || parseInt(img.getAttribute('width')) || 0;
      let height = img.naturalHeight || parseInt(img.getAttribute('height')) || 0;
      
      if (width === 0 || height === 0) {
        const style = img.getAttribute('style') || '';
        const wMatch = style.match(/width[:\s]*(\d+)/i);
        const hMatch = style.match(/height[:\s]*(\d+)/i);
        if (wMatch) width = parseInt(wMatch[1]);
        if (hMatch) height = parseInt(hMatch[1]);
      }
      
      if (width < MIN_WIDTH || height < MIN_HEIGHT) {
        const parent = img.closest('.img, .photo, .tupian, .gallery, .content, article, .post');
        if (parent) {
          width = Math.max(width, 800);
          height = Math.max(height, 800);
        }
      }
      
      if (width >= MIN_WIDTH && height >= MIN_HEIGHT) {
        seen.add(src);
        collected.push({ src: src, width: width, height: height });
      }
    });

    return collected;
  }

  function extractImagesQuick() {
    return extractImagesFromDoc(document);
  }

  function parsePageUrl(url) {
    const match = url.match(/^(.+?)(?:_(\d+))?\.html$/);
    if (match) {
      return {
        baseUrl: match[1],
        pageNum: match[2] ? parseInt(match[2]) : 1
      };
    }
    return null;
  }

  function buildNextPageUrl(base, pageNum) {
    if (pageNum === 1) {
      return base + '_2.html';
    }
    return base + '_' + pageNum + '.html';
  }

  function findNextPageLink() {
    const parsed = parsePageUrl(window.location.href);
    if (parsed) {
      baseUrl = parsed.baseUrl;
      currentPageNum = parsed.pageNum;
      return buildNextPageUrl(baseUrl, currentPageNum);
    }
    return null;
  }

  async function fetchPageImages(url) {
    try {
      console.log('[图片浏览助手] 正在获取:', url);
      const response = await fetch(url);
      if (!response.ok) {
        console.log('[图片浏览助手] 请求失败:', response.status);
        return [];
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const newImages = extractImagesFromDoc(doc);
      console.log('[图片浏览助手] 找到图片:', newImages.length);
      
      return newImages;
    } catch (e) {
      console.error('[图片浏览助手] 获取页面失败:', e);
      return [];
    }
  }

  async function loadNextPage() {
    if (isLoadingNextPage) return false;
    if (!baseUrl) return false;
    
    isLoadingNextPage = true;
    showLoading('正在加载下一页...');
    
    const nextPage = currentPageNum + 1;
    const urlToLoad = buildNextPageUrl(baseUrl, nextPage);
    
    console.log('[图片浏览助手] 加载URL:', urlToLoad);
    const newImages = await fetchPageImages(urlToLoad);
    
    if (newImages.length > 0) {
      images = images.concat(newImages);
      currentPageNum = nextPage;
      updateTitle();
      showStatus(`已加载第${currentPageNum}页 (${newImages.length}张)`);
      console.log('[图片浏览助手] 加载成功, 总图片:', images.length);
    } else {
      showStatus('没有更多图片了');
      console.log('[图片浏览助手] 没有更多图片');
    }
    
    hideLoading();
    isLoadingNextPage = false;
    
    return newImages.length > 0;
  }

  function showLoading(text) {
    let loading = document.getElementById('viewer-loading-indicator');
    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'viewer-loading-indicator';
      loading.className = 'viewer-loading';
      viewer.querySelector('.viewer-body').appendChild(loading);
    }
    loading.textContent = text;
    loading.style.display = 'block';
  }

  function hideLoading() {
    const loading = document.getElementById('viewer-loading-indicator');
    if (loading) loading.style.display = 'none';
  }

  function showStatus(text) {
    const status = document.createElement('div');
    status.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(102, 126, 234, 0.9);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 16px;
      z-index: 1000000;
    `;
    status.textContent = text;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 1500);
  }

  function updateTitle() {
    if (titleSpan) {
      titleSpan.textContent = `图片浏览 (${images.length}张)`;
    }
  }

  function updateCounter() {
    if (images.length === 0) return;
    counter.textContent = `${currentIndex + 1} / ${images.length}`;
    if (images[currentIndex]) {
      const img = images[currentIndex];
      if (img.width > 0 && img.height > 0) {
        sizeInfo.textContent = `(${img.width}×${img.height})`;
      } else {
        sizeInfo.textContent = '';
      }
    }
  }

  async function showImage(index) {
    if (images.length === 0) return;
    
    if (index >= images.length) {
      const loaded = await loadNextPage();
      if (loaded) {
        index = images.length - 1;
      } else {
        index = images.length - 1;
      }
    }
    
    if (index < 0) index = 0;
    if (index >= images.length) index = images.length - 1;
    
    currentIndex = index;
    viewerImg.src = images[currentIndex].src;
    updateCounter();
  }

  function closeViewer() {
    viewer.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeydown);
  }

  async function handleKeydown(e) {
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
        await loadNextPage();
        break;
    }
  }

  images = extractImagesQuick();
  
  if (images.length === 0) {
    alert('未找到大尺寸图片（需要宽度和高度均超过800像素）');
    return;
  }

  findNextPageLink();

  viewer = document.createElement('div');
  viewer.id = 'image-viewer-overlay';
  viewer.innerHTML = `
    <div class="viewer-header">
      <span class="viewer-title">图片浏览 (${images.length}张)</span>
      <span class="viewer-counter">1 / ${images.length}</span>
      <span class="viewer-size"></span>
      <button class="viewer-close">&times;</button>
    </div>
    <div class="viewer-body">
      <button class="viewer-prev">&#10094;</button>
      <div class="viewer-container">
        <img class="viewer-image" src="${images[0].src}" alt="图片">
      </div>
      <button class="viewer-next">&#10095;</button>
    </div>
    <div class="viewer-footer">
      <span class="viewer-hint">← → 切换 | ESC 关闭 | 空格 加载下一页</span>
    </div>
  `;

  document.body.appendChild(viewer);
  document.body.style.overflow = 'hidden';

  titleSpan = viewer.querySelector('.viewer-title');
  viewerImg = viewer.querySelector('.viewer-image');
  counter = viewer.querySelector('.viewer-counter');
  sizeInfo = viewer.querySelector('.viewer-size');
  prevBtn = viewer.querySelector('.viewer-prev');
  nextBtn = viewer.querySelector('.viewer-next');
  closeBtn = viewer.querySelector('.viewer-close');

  prevBtn.addEventListener('click', async () => await showImage(currentIndex - 1));
  nextBtn.addEventListener('click', async () => await showImage(currentIndex + 1));
  closeBtn.addEventListener('click', closeViewer);
  viewer.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  document.addEventListener('keydown', handleKeydown);

  for (let i = 0; i < Math.min(5, images.length); i++) {
    new Image().src = images[i].src;
  }

  updateCounter();
}

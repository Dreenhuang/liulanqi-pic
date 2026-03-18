chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-viewer') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleViewer' });
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggleViewer' });
});

// 处理下载请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadImage') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] 下载失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Background] 下载已开始, ID:', downloadId);
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true; // 保持消息通道开放
  }
});

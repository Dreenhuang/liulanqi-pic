document.getElementById('openViewer').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            if (typeof toggleViewer === 'function') {
              toggleViewer();
            } else {
              alert('页面尚未加载完成，请刷新页面后重试');
            }
          }
        });
        window.close();
      } catch (error) {
        console.error('执行脚本失败:', error);
        alert('无法连接到页面，请刷新页面后重试');
      }
    }
  });
});

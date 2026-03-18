document.addEventListener('DOMContentLoaded', () => {
  const minWidthInput = document.getElementById('minWidth');
  const minHeightInput = document.getElementById('minHeight');
  const downloadPathInput = document.getElementById('downloadPath');
  const previewSize = document.getElementById('previewSize');
  const resetPathBtn = document.getElementById('resetPath');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const status = document.getElementById('status');
  
  const DEFAULT_PATH = 'D:\\\\PIC';
  
  // 加载保存的设置
  loadSettings();
  
  // 实时更新预览
  function updatePreview() {
    const width = minWidthInput.value || 600;
    const height = minHeightInput.value || 600;
    previewSize.textContent = `${width} × ${height}`;
  }
  
  minWidthInput.addEventListener('input', updatePreview);
  minHeightInput.addEventListener('input', updatePreview);
  
  // 恢复默认路径
  resetPathBtn.addEventListener('click', () => {
    downloadPathInput.value = DEFAULT_PATH;
  });
  
  // 加载设置
  function loadSettings() {
    chrome.storage.sync.get({
      minWidth: 600,
      minHeight: 600,
      downloadPath: DEFAULT_PATH
    }, (items) => {
      minWidthInput.value = items.minWidth;
      minHeightInput.value = items.minHeight;
      downloadPathInput.value = items.downloadPath;
      updatePreview();
    });
  }
  
  // 保存设置
  function saveSettings() {
    const minWidth = parseInt(minWidthInput.value) || 600;
    const minHeight = parseInt(minHeightInput.value) || 600;
    const downloadPath = downloadPathInput.value.trim() || DEFAULT_PATH;
    
    chrome.storage.sync.set({
      minWidth: minWidth,
      minHeight: minHeight,
      downloadPath: downloadPath
    }, () => {
      showStatus('设置已保存');
    });
  }
  
  // 显示状态提示
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.classList.add('show');
    
    setTimeout(() => {
      status.classList.remove('show');
    }, 3000);
  }
  
  // 保存按钮
  saveBtn.addEventListener('click', saveSettings);
  
  // 取消按钮
  cancelBtn.addEventListener('click', () => {
    loadSettings();
    showStatus('已恢复原始设置');
  });
});

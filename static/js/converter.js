let currentFile = null;
let currentFileInfo = null;
let selectedFormat = null;
let downloadUrl = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentFile();
    initializeFormatSelection();
});

function loadCurrentFile() {
    currentFile = sessionStorage.getItem('currentFile');
    currentFileInfo = JSON.parse(sessionStorage.getItem('currentFileInfo') || '{}');
    
    if (!currentFile) {
        document.getElementById('currentFileName').textContent = '未选择文件';
        document.getElementById('currentFileInfo').textContent = '请先在主页上传音频文件';
        return;
    }
    
    // 显示当前文件信息
    const originalName = currentFile.split('_').slice(1).join('_');
    document.getElementById('currentFileName').textContent = originalName;
    document.getElementById('currentFileInfo').textContent = 
        `时长: ${formatDuration(currentFileInfo.duration)} | ` +
        `采样率: ${currentFileInfo.sample_rate} Hz | ` +
        `声道: ${currentFileInfo.channels === 1 ? '单声道' : '立体声'}`;
    
    // 设置音频播放器
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.src = `/static/uploads/${currentFile}`;
    audioPlayer.style.display = 'block';
    
    // 显示转换选项
    document.getElementById('conversionSection').style.display = 'block';
}

function initializeFormatSelection() {
    const formatOptions = document.querySelectorAll('.format-option');
    
    formatOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选中状态
            formatOptions.forEach(opt => opt.classList.remove('selected'));
            
            // 添加选中状态
            this.classList.add('selected');
            selectedFormat = this.dataset.format;
            
            // 启用转换按钮
            document.getElementById('convertBtn').disabled = false;
        });
    });
}

function startConversion() {
    if (!currentFile || !selectedFormat) {
        alert('请选择要转换的格式');
        return;
    }
    
    const convertBtn = document.getElementById('convertBtn');
    const btnText = convertBtn.querySelector('.btn-text');
    const loading = convertBtn.querySelector('.loading');
    
    // 显示加载状态
    convertBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    
    // 获取质量设置
    const selectedOption = document.querySelector('.format-option.selected');
    const qualitySelect = selectedOption.querySelector('.quality-select');
    const quality = qualitySelect.value;
    
    // 发送转换请求
    fetch('/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input_file: currentFile,
            output_format: selectedFormat,
            quality: quality
        })
    })
    .then(response => response.json())
    .then(data => {
        // 恢复按钮状态
        convertBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        if (data.success) {
            showConversionResult(data);
        } else {
            alert('转换失败: ' + data.error);
        }
    })
    .catch(error => {
        // 恢复按钮状态
        convertBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        alert('转换失败: ' + error.message);
    });
}

function showConversionResult(data) {
    downloadUrl = data.download_url;
    
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 设置结果消息
    document.getElementById('resultMessage').textContent = 
        `文件已成功转换为 ${selectedFormat.toUpperCase()} 格式`;
    
    // 设置结果播放器
    const resultPlayer = document.getElementById('resultPlayer');
    resultPlayer.src = `/static/processed/${data.output_file}`;
    
    // 滚动到结果区域
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function downloadResult() {
    if (downloadUrl) {
        window.open(downloadUrl, '_blank');
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
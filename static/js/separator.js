let currentFile = null;
let currentFileInfo = null;
let vocalsUrl = null;
let accompanimentUrl = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentFile();
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
    
    // 显示分离信息
    document.getElementById('infoSection').style.display = 'block';
}

function startSeparation() {
    if (!currentFile) {
        alert('请先上传音频文件');
        return;
    }
    
    const separateBtn = document.getElementById('separateBtn');
    const btnText = separateBtn.querySelector('.btn-text');
    const loading = separateBtn.querySelector('.loading');
    
    // 显示加载状态
    separateBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    
    // 显示进度区域
    document.getElementById('progressSection').style.display = 'block';
    
    // 模拟进度更新
    simulateProgress();
    
    // 发送分离请求
    fetch('/separate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input_file: currentFile
        })
    })
    .then(response => response.json())
    .then(data => {
        // 恢复按钮状态
        separateBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        if (data.success) {
            showSeparationResult(data);
        } else {
            alert('分离失败: ' + data.error);
            resetProgress();
        }
    })
    .catch(error => {
        // 恢复按钮状态
        separateBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        alert('分离失败: ' + error.message);
        resetProgress();
    });
}

function simulateProgress() {
    // 步骤1: 准备音频
    setTimeout(() => {
        updateProgressStep(2, '正在使用AI模型分析音频...');
    }, 2000);
    
    // 步骤2: AI分析
    setTimeout(() => {
        updateProgressStep(3, '正在生成分离结果...');
    }, 5000);
}

function updateProgressStep(stepNumber, message) {
    // 更新步骤状态
    for (let i = 1; i <= stepNumber; i++) {
        document.getElementById(`step${i}`).classList.add('active');
    }
    
    // 更新进度消息
    document.getElementById('progressMessage').textContent = message;
}

function resetProgress() {
    document.getElementById('progressSection').style.display = 'none';
    
    // 重置所有步骤
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`step${i}`).classList.remove('active');
    }
    
    document.getElementById('step1').classList.add('active');
    document.getElementById('progressMessage').textContent = '正在准备音频文件...';
}

function showSeparationResult(data) {
    vocalsUrl = data.vocals_url;
    accompanimentUrl = data.accompaniment_url;
    
    // 隐藏进度区域
    document.getElementById('progressSection').style.display = 'none';
    
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 设置音频播放器
    document.getElementById('vocalsPlayer').src = `/static/processed/${data.vocals_file}`;
    document.getElementById('accompanimentPlayer').src = `/static/processed/${data.accompaniment_file}`;
    
    // 滚动到结果区域
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

function downloadVocals() {
    if (vocalsUrl) {
        window.open(vocalsUrl, '_blank');
    }
}

function downloadAccompaniment() {
    if (accompanimentUrl) {
        window.open(accompanimentUrl, '_blank');
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
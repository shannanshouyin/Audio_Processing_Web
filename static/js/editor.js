// 全局变量
let currentFile = null;
let currentFileInfo = null;
let audioContext = null;
let audioBuffer = null;
let waveformData = null;
let canvas = null;
let ctx = null;
let isSelecting = false;
let selectionStart = 0;
let selectionEnd = 0;
let downloadUrl = null;

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentFile();
    initializeEditor();
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
    
    // 设置结束时间默认值
    document.getElementById('endTime').value = currentFileInfo.duration.toFixed(1);
    document.getElementById('endTime').max = currentFileInfo.duration;
    document.getElementById('startTime').max = currentFileInfo.duration;
    selectionEnd = currentFileInfo.duration;
    updateSelectionDuration();
    
    // 显示编辑器
    document.getElementById('editorSection').style.display = 'block';
    
    // 加载音频数据
    loadAudioData();
}

function initializeEditor() {
    canvas = document.getElementById('waveformCanvas');
    ctx = canvas.getContext('2d');
    
    // 设置canvas的实际尺寸
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 添加鼠标事件监听
    canvas.addEventListener('mousedown', startSelection);
    canvas.addEventListener('mousemove', updateSelection);
    canvas.addEventListener('mouseup', endSelection);
    canvas.addEventListener('mouseleave', endSelection);
    
    // 改用blur事件而不是input事件，避免实时验证导致的光标跳转
    document.getElementById('startTime').addEventListener('blur', validateTimeInputs);
    document.getElementById('endTime').addEventListener('blur', validateTimeInputs);
    
    // 添加实时更新选择时长的监听器（不修改输入框值）
    document.getElementById('startTime').addEventListener('input', updateSelectionDurationOnly);
    document.getElementById('endTime').addEventListener('input', updateSelectionDurationOnly);
    
    // 窗口大小改变时重新绘制
    window.addEventListener('resize', function() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (waveformData) {
            generateWaveform();
            drawWaveform();
        }
    });
}

// 只更新选择时长显示，不修改输入框值
function updateSelectionDurationOnly() {
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    const duration = Math.abs(endTime - startTime);
    document.getElementById('selectionDuration').textContent = duration.toFixed(1);
}

// 验证时间输入（仅在失去焦点时触发）
function validateTimeInputs() {
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    
    let startTime = parseFloat(startInput.value) || 0;
    let endTime = parseFloat(endInput.value) || 0;
    
    // 限制范围
    startTime = Math.max(0, Math.min(startTime, currentFileInfo.duration));
    endTime = Math.max(0, Math.min(endTime, currentFileInfo.duration));
    
    // 确保开始时间小于结束时间
    if (startTime >= endTime) {
        if (startInput === document.activeElement || startInput.value !== startInput.defaultValue) {
            endTime = Math.min(startTime + 0.1, currentFileInfo.duration);
        } else {
            startTime = Math.max(endTime - 0.1, 0);
        }
    }
    
    startInput.value = startTime.toFixed(1);
    endInput.value = endTime.toFixed(1);
    
    updateSelectionDuration();
}

function updateSelectionDuration() {
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    const duration = Math.abs(endTime - startTime);
    document.getElementById('selectionDuration').textContent = duration.toFixed(1);
}

async function loadAudioData() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const response = await fetch(`/static/uploads/${currentFile}`);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        generateWaveform();
        drawWaveform();
        
    } catch (error) {
        console.error('加载音频数据失败:', error);
        alert('加载音频数据失败，请重试');
    }
}

function generateWaveform() {
    const channelData = audioBuffer.getChannelData(0);
    const samples = canvas.width;
    const blockSize = Math.floor(channelData.length / samples);
    
    waveformData = [];
    
    for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
        }
        waveformData.push(sum / blockSize);
    }
}

function drawWaveform() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制波形
    ctx.fillStyle = '#667eea';
    const centerY = canvas.height / 2;
    const maxHeight = canvas.height * 0.8;
    
    for (let i = 0; i < waveformData.length; i++) {
        const height = waveformData[i] * maxHeight;
        const x = i;
        
        ctx.fillRect(x, centerY - height / 2, 1, height);
    }
    
    // 绘制选择区域
    drawSelection();
}

function drawSelection() {
    if (selectionStart === selectionEnd) return;
    
    const duration = currentFileInfo.duration;
    const startX = (selectionStart / duration) * canvas.width;
    const endX = (selectionEnd / duration) * canvas.width;
    const width = endX - startX;
    
    // 绘制选择区域背景
    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.fillRect(startX, 0, width, canvas.height);
    
    // 绘制选择区域边框
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, 0, width, canvas.height);
}

function startSelection(e) {
    isSelecting = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * currentFileInfo.duration;
    
    selectionStart = Math.max(0, Math.min(time, currentFileInfo.duration));
    selectionEnd = selectionStart;
    
    updateTimeInputsFromSelection();
    drawWaveform();
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * currentFileInfo.duration;
    
    selectionEnd = Math.max(0, Math.min(time, currentFileInfo.duration));
    
    // 确保开始时间小于结束时间
    if (selectionEnd < selectionStart) {
        [selectionStart, selectionEnd] = [selectionEnd, selectionStart];
    }
    
    updateTimeInputsFromSelection();
    drawWaveform();
}

function endSelection() {
    isSelecting = false;
    
    // 如果选择区域太小，重置选择
    if (Math.abs(selectionEnd - selectionStart) < 0.1) {
        resetSelection();
        return;
    }
    
    document.getElementById('trimBtn').disabled = false;
}

// 从选择更新时间输入框
function updateTimeInputsFromSelection() {
    document.getElementById('startTime').value = selectionStart.toFixed(1);
    document.getElementById('endTime').value = selectionEnd.toFixed(1);
    updateSelectionDuration();
}

// 验证时间输入
// 验证时间输入
function validateTimeInputs() {
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    
    let startTime = parseFloat(startInput.value) || 0;
    let endTime = parseFloat(endInput.value) || 0;
    
    // 限制范围 - 移除小于10的限制
    startTime = Math.max(0, Math.min(startTime, currentFileInfo.duration));
    endTime = Math.max(0, Math.min(endTime, currentFileInfo.duration));
    
    // 确保开始时间小于结束时间
    if (startTime >= endTime) {
        if (startInput === document.activeElement) {
            endTime = Math.min(startTime + 0.1, currentFileInfo.duration);
        } else {
            startTime = Math.max(endTime - 0.1, 0);
        }
    }
    
    startInput.value = startTime.toFixed(1);
    endInput.value = endTime.toFixed(1);
    
    updateSelectionDuration();
}

// 应用时间输入到选择
function applyTimeInputs() {
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    
    if (startTime >= endTime) {
        alert('开始时间必须小于结束时间');
        return;
    }
    
    selectionStart = startTime;
    selectionEnd = endTime;
    
    drawWaveform();
    document.getElementById('trimBtn').disabled = false;
}

function updateSelectionDuration() {
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    const duration = Math.abs(endTime - startTime);
    document.getElementById('selectionDuration').textContent = duration.toFixed(1);
}

function playSelection() {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.currentTime = selectionStart;
    audioPlayer.play();
    
    // 在选择结束时暂停
    const checkTime = setInterval(() => {
        if (audioPlayer.currentTime >= selectionEnd) {
            audioPlayer.pause();
            clearInterval(checkTime);
        }
    }, 100);
}

function resetSelection() {
    selectionStart = 0;
    selectionEnd = currentFileInfo.duration;
    updateTimeInputsFromSelection();
    drawWaveform();
    document.getElementById('trimBtn').disabled = true;
}

function trimAudio() {
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    
    if (startTime >= endTime) {
        alert('请选择有效的时间范围');
        return;
    }
    
    const trimBtn = document.getElementById('trimBtn');
    const btnText = trimBtn.querySelector('.btn-text');
    const loading = trimBtn.querySelector('.loading');
    
    // 显示加载状态
    trimBtn.disabled = true;
    btnText.style.display = 'none';
    loading.style.display = 'inline-block';
    
    // 发送剪辑请求
    fetch('/trim', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            input_file: currentFile,
            start_time: startTime,
            end_time: endTime
        })
    })
    .then(response => response.json())
    .then(data => {
        // 恢复按钮状态
        trimBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        if (data.success) {
            showTrimResult(data);
        } else {
            alert('剪辑失败: ' + data.error);
        }
    })
    .catch(error => {
        // 恢复按钮状态
        trimBtn.disabled = false;
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        
        alert('剪辑失败: ' + error.message);
    });
}

function showTrimResult(data) {
    downloadUrl = data.download_url;
    
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 设置结果消息
    const startTime = parseFloat(document.getElementById('startTime').value) || 0;
    const endTime = parseFloat(document.getElementById('endTime').value) || 0;
    const duration = endTime - startTime;
    document.getElementById('resultMessage').textContent = 
        `音频已成功剪辑，时长: ${duration.toFixed(1)} 秒`;
    
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
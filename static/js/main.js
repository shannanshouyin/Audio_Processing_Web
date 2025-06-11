// 全局变量
let currentFile = null;
let currentFileInfo = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
    // 检查是否有保存的音频文件
    restoreAudioFromSession();
});

// 恢复会话中的音频文件
function restoreAudioFromSession() {
    const savedFile = sessionStorage.getItem('currentFile');
    const savedFileInfo = sessionStorage.getItem('currentFileInfo');
    
    if (savedFile && savedFileInfo) {
        currentFile = savedFile;
        currentFileInfo = JSON.parse(savedFileInfo);
        
        // 重新显示音频信息
        const response = {
            original_name: savedFile.split('_').slice(1).join('_'),
            file_url: `/static/uploads/${savedFile}`,
            audio_info: currentFileInfo
        };
        
        displayAudioInfo(response);
        showTools();
    }
}

function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // 文件选择上传
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    // 验证文件类型
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/ogg', 'audio/x-ms-wma'];
    if (!allowedTypes.some(type => file.type.includes(type.split('/')[1]))) {
        alert('不支持的文件格式！');
        return;
    }
    
    // 验证文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
        alert('文件大小不能超过100MB！');
        return;
    }
    
    uploadFile(file);
}

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'block';
    
    const xhr = new XMLHttpRequest();
    
    // 上传进度
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressFill.style.width = percentComplete + '%';
            progressText.textContent = Math.round(percentComplete) + '%';
        }
    });
    
    xhr.addEventListener('load', function() {
        progressContainer.style.display = 'none';
        
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
                currentFile = response.filename;
                currentFileInfo = response.audio_info;
                displayAudioInfo(response);
                showTools();
                // 保存到会话存储
                sessionStorage.setItem('currentFile', currentFile);
                sessionStorage.setItem('currentFileInfo', JSON.stringify(currentFileInfo));
            } else {
                alert('上传失败: ' + response.error);
            }
        } else {
            alert('上传失败，请重试');
        }
    });
    
    xhr.addEventListener('error', function() {
        progressContainer.style.display = 'none';
        alert('上传失败，请检查网络连接');
    });
    
    xhr.open('POST', '/upload');
    xhr.send(formData);
}

function displayAudioInfo(response) {
    const audioInfo = document.getElementById('audioInfo');
    const audioPlayer = document.getElementById('audioPlayer');
    
    document.getElementById('fileName').textContent = response.original_name;
    document.getElementById('fileSize').textContent = formatFileSize(response.audio_info.file_size);
    document.getElementById('duration').textContent = formatDuration(response.audio_info.duration);
    document.getElementById('sampleRate').textContent = response.audio_info.sample_rate + ' Hz';
    document.getElementById('channels').textContent = response.audio_info.channels === 1 ? '单声道' : '立体声';
    
    audioPlayer.src = response.file_url;
    audioInfo.style.display = 'block';
}

// 添加文件大小格式化函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 删除当前音频
function deleteCurrentAudio() {
    if (!currentFile) {
        alert('没有音频文件可删除');
        return;
    }
    
    if (confirm('确定要删除当前音频文件吗？')) {
        // 清除全局变量
        currentFile = null;
        currentFileInfo = null;
        
        // 清除会话存储
        sessionStorage.removeItem('currentFile');
        sessionStorage.removeItem('currentFileInfo');
        
        // 隐藏音频信息和工具区域
        document.getElementById('audioInfo').style.display = 'none';
        document.getElementById('toolsSection').style.display = 'none';
        
        // 重置文件输入
        document.getElementById('fileInput').value = '';
        
        alert('音频文件已删除');
    }
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showTools() {
    document.getElementById('toolsSection').style.display = 'block';
}

function goToConverter() {
    if (!currentFile) {
        alert('请先上传音频文件');
        return;
    }
    sessionStorage.setItem('currentFile', currentFile);
    sessionStorage.setItem('currentFileInfo', JSON.stringify(currentFileInfo));
    window.location.href = '/converter';
}

function goToEditor() {
    if (!currentFile) {
        alert('请先上传音频文件');
        return;
    }
    sessionStorage.setItem('currentFile', currentFile);
    sessionStorage.setItem('currentFileInfo', JSON.stringify(currentFileInfo));
    window.location.href = '/editor';
}

function goToSeparator() {
    if (!currentFile) {
        alert('请先上传音频文件');
        return;
    }
    sessionStorage.setItem('currentFile', currentFile);
    sessionStorage.setItem('currentFileInfo', JSON.stringify(currentFileInfo));
    window.location.href = '/separator';
}
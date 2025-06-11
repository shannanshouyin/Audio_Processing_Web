from flask import Flask, render_template, request, jsonify, send_file, url_for
import os
import uuid
from werkzeug.utils import secure_filename
from utils.audio_processor import AudioProcessor
from utils.file_handler import FileHandler

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('static/processed', exist_ok=True)

# 支持的音频格式
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/converter')
def converter():
    return render_template('converter.html')

@app.route('/editor')
def editor():
    return render_template('editor.html')

@app.route('/separator')
def separator():
    return render_template('separator.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有选择文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if file and allowed_file(file.filename):
        # 保存原始文件名（包含中文）
        original_filename = file.filename
        # 生成安全的存储文件名
        safe_filename = secure_filename(file.filename)
        # 如果secure_filename返回空字符串（全是非ASCII字符），使用默认名称
        if not safe_filename:
            file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'unknown'
            safe_filename = f"audio_file.{file_ext}"
        
        unique_filename = f"{uuid.uuid4()}_{safe_filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # 获取文件大小
        file_size = os.path.getsize(filepath)
        
        # 获取音频信息
        audio_info = AudioProcessor.get_audio_info(filepath)
        # 添加文件大小到音频信息中
        audio_info['file_size'] = file_size
        
        return jsonify({
            'success': True,
            'filename': unique_filename,
            'original_name': original_filename,  # 返回原始文件名（包含中文）
            'file_url': url_for('static', filename=f'uploads/{unique_filename}'),
            'audio_info': audio_info
        })
    
    return jsonify({'error': '不支持的文件格式'}), 400

@app.route('/convert', methods=['POST'])
def convert_audio():
    data = request.get_json()
    input_file = data.get('input_file')
    output_format = data.get('output_format')
    
    if not input_file or not output_format:
        return jsonify({'error': '缺少必要参数'}), 400
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)
    output_filename = f"{uuid.uuid4()}.{output_format}"
    output_path = os.path.join('static/processed', output_filename)
    
    try:
        AudioProcessor.convert_format(input_path, output_path, output_format)
        return jsonify({
            'success': True,
            'output_file': output_filename,
            'download_url': url_for('download_file', filename=output_filename)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/trim', methods=['POST'])
def trim_audio():
    data = request.get_json()
    input_file = data.get('input_file')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    
    if not all([input_file, start_time is not None, end_time is not None]):
        return jsonify({'error': '缺少必要参数'}), 400
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)
    output_filename = f"{uuid.uuid4()}_trimmed.mp3"
    output_path = os.path.join('static/processed', output_filename)
    
    try:
        AudioProcessor.trim_audio(input_path, output_path, start_time, end_time)
        return jsonify({
            'success': True,
            'output_file': output_filename,
            'download_url': url_for('download_file', filename=output_filename)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/separate', methods=['POST'])
def separate_audio():
    data = request.get_json()
    input_file = data.get('input_file')
    
    if not input_file:
        return jsonify({'error': '缺少必要参数'}), 400
    
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], input_file)
    vocals_filename = f"{uuid.uuid4()}_vocals.wav"
    accompaniment_filename = f"{uuid.uuid4()}_accompaniment.wav"
    
    vocals_path = os.path.join('static/processed', vocals_filename)
    accompaniment_path = os.path.join('static/processed', accompaniment_filename)
    
    try:
        AudioProcessor.separate_vocals(input_path, vocals_path, accompaniment_path)
        return jsonify({
            'success': True,
            'vocals_file': vocals_filename,
            'accompaniment_file': accompaniment_filename,
            'vocals_url': url_for('download_file', filename=vocals_filename),
            'accompaniment_url': url_for('download_file', filename=accompaniment_filename)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(os.path.join('static/processed', filename), as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
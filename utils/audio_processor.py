import subprocess
import os
import json
from pathlib import Path

class AudioProcessor:
    @staticmethod
    def get_audio_info(file_path):
        """获取音频文件信息"""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            info = json.loads(result.stdout)
            
            audio_stream = next((s for s in info['streams'] if s['codec_type'] == 'audio'), None)
            if audio_stream:
                return {
                    'duration': float(info['format']['duration']),
                    'bitrate': int(info['format']['bit_rate']) if 'bit_rate' in info['format'] else None,
                    'sample_rate': int(audio_stream['sample_rate']),
                    'channels': int(audio_stream['channels']),
                    'codec': audio_stream['codec_name']
                }
        except Exception as e:
            print(f"Error getting audio info: {e}")
            return None
    
    @staticmethod
    def convert_format(input_path, output_path, output_format):
        """转换音频格式"""
        cmd = ['ffmpeg', '-i', input_path, '-y', output_path]
        
        # 根据输出格式设置参数
        if output_format == 'mp3':
            cmd.extend(['-codec:a', 'libmp3lame', '-b:a', '192k'])
        elif output_format == 'wav':
            cmd.extend(['-codec:a', 'pcm_s16le'])
        elif output_format == 'flac':
            cmd.extend(['-codec:a', 'flac'])
        elif output_format == 'aac':
            cmd.extend(['-codec:a', 'aac', '-b:a', '128k'])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"转换失败: {result.stderr}")
    
    @staticmethod
    def trim_audio(input_path, output_path, start_time, end_time):
        """剪辑音频"""
        duration = end_time - start_time
        cmd = [
            'ffmpeg', '-i', input_path, '-ss', str(start_time),
            '-t', str(duration), '-y', output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"剪辑失败: {result.stderr}")
    
    @staticmethod
    def separate_vocals(input_path, vocals_path, accompaniment_path):
        """分离人声和伴奏"""
        # 使用demucs进行音频分离
        temp_dir = 'temp_separation'
        os.makedirs(temp_dir, exist_ok=True)
        
        cmd = ['python', '-m', 'demucs', '--two-stems=vocals', '-o', temp_dir, input_path]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"分离失败: {result.stderr}")
        
        # 移动分离后的文件
        input_name = Path(input_path).stem
        separated_dir = os.path.join(temp_dir, 'htdemucs', input_name)
        
        # 复制分离后的文件到目标位置
        import shutil
        shutil.copy(os.path.join(separated_dir, 'vocals.wav'), vocals_path)
        shutil.copy(os.path.join(separated_dir, 'no_vocals.wav'), accompaniment_path)
        
        # 清理临时文件
        shutil.rmtree(temp_dir)
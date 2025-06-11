import os
import shutil
from pathlib import Path

class FileHandler:
    @staticmethod
    def cleanup_old_files(directory, max_age_hours=24):
        """清理旧文件"""
        import time
        current_time = time.time()
        
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            if os.path.isfile(file_path):
                file_age = current_time - os.path.getctime(file_path)
                if file_age > max_age_hours * 3600:
                    os.remove(file_path)
    
    @staticmethod
    def get_file_size(file_path):
        """获取文件大小"""
        return os.path.getsize(file_path)
    
    @staticmethod
    def ensure_directory(directory):
        """确保目录存在"""
        os.makedirs(directory, exist_ok=True)
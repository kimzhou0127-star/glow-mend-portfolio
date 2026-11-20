"""Create each character's gallery video with its original audio and first-frame poster."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[1]
from media_config import ff, source_root
for number, slug in enumerate(['shield-soother', 'mind-trimmer', 'gloom-blaster'], 1):
    source = source_root / f'角色{number}' / '翻页1.mp4'
    dest = root / 'public/assets/characters' / slug
    subprocess.run([ff, '-v', 'error', '-i', str(source), '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-y', str(dest / 'gallery-v1.mp4')], check=True)
    subprocess.run([ff, '-v', 'error', '-i', str(dest / 'gallery-v1.mp4'), '-frames:v', '1', '-c:v', 'libwebp', '-quality', '92', '-y', str(dest / 'gallery-v1-poster.webp')], check=True)
    print(f'角色{number}: {slug}/gallery-v1.mp4 with original audio', flush=True)

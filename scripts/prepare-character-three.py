"""Prepare Gloom Blaster and the replacement Shield Soother orbit."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
from PIL import Image, ImageOps

from media_config import ff, source_root
source = source_root
assets = root / 'public/assets/characters'
motion = assets / 'gloom-blaster'
motion.mkdir(parents=True, exist_ok=True)

def image(name, destination, size):
    im = ImageOps.exif_transpose(Image.open(source / '角色3' / name)).convert('RGB')
    im.thumbnail(size)
    im.save(assets / destination, 'WEBP', quality=92)

def orbit(original, destination):
    target = assets / destination
    target.mkdir(parents=True, exist_ok=True)
    subprocess.run([ff, '-v', 'error', '-i', str(source / original), '-vf', 'fps=24,scale=480:640,tile=8x6', '-frames:v', '4', '-c:v', 'libwebp', '-quality', '88', '-start_number', '0', '-y', str(target / 'atlas-%d.webp')], check=True)
    subprocess.run([ff, '-v', 'error', '-i', str(source / original), '-vf', 'scale=480:640', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', '-y', str(target / 'poster.webp')], check=True)

image('角色3-1.png', 'character-3-detail-small.webp', (1100, 700))
image('角色3-2.jpg', 'character-3-detail-large.webp', (1400, 900))
image('按钮icon.png', 'gloom-blaster/icon.webp', (180, 180))
image('996865f8-43f3-433d-be8e-d7b3a39e063d.png', 'character-3-gallery-portrait-v2.webp', (1440, 1930))
orbit('角色3/头部环绕.mp4', 'gloom-blaster/look-v1')
orbit('角色1/头部环绕-2.mp4', 'shield-soother/look-v3')
for name, filename in [('摸头', 'head'), ('摸手', 'hand'), ('摸裤子', 'trousers')]:
    subprocess.run([ff, '-v', 'error', '-i', str(source / '角色3' / f'{name}.mp4'), '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-y', str(motion / f'{filename}.mp4')], check=True)
print('Prepared Gloom Blaster media with original action audio and Shield Soother look-v3.')

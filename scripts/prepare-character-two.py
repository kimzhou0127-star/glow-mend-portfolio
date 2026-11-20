"""Prepare Mind Trimmer media without touching Shield Soother's motion assets."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
from PIL import Image, ImageOps

from media_config import ff, source_root
source = source_root
assets = root / 'public/assets/characters'
motion = assets / 'mind-trimmer'
(motion / 'look-v1').mkdir(parents=True, exist_ok=True)

def image(folder, name, destination, size):
    im = ImageOps.exif_transpose(Image.open(source / folder / name)).convert('RGB')
    im.thumbnail(size)
    im.save(assets / destination, 'WEBP', quality=92)

image('角色2', '角色1-1.png', 'character-2-detail-small.webp', (1100, 700))
image('角色2', '角色1-2.jpg', 'character-2-detail-large.webp', (1400, 900))
image('角色2', '按钮icon.png', 'mind-trimmer/icon.webp', (180, 180))
image('角色2', 'image_d9fd3839-f151-460f-984e-f8136a6226b0_0.png', 'character-2-gallery-portrait.webp', (1440, 1928))
image('角色1', 'ebd22853-1183-476f-a5d0-a803de5b6ba5.png', 'character-1-gallery-portrait.webp', (1440, 1928))

subprocess.run([ff, '-v', 'error', '-i', str(source / '角色2/头部环绕.mp4'), '-vf', 'fps=24,scale=480:640,tile=8x6', '-frames:v', '4', '-c:v', 'libwebp', '-quality', '88', '-start_number', '0', '-y', str(motion / 'look-v1/atlas-%d.webp')], check=True)
subprocess.run([ff, '-v', 'error', '-i', str(source / '角色2/头部环绕.mp4'), '-vf', 'scale=480:640', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', '-y', str(motion / 'look-v1/poster.webp')], check=True)
for name, filename in [('摸头', 'head'), ('摸手', 'hand'), ('摸裤子', 'trousers')]:
    subprocess.run([ff, '-v', 'error', '-i', str(source / '角色2' / f'{name}.mp4'), '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-y', str(motion / f'{filename}.mp4')], check=True)
print('Prepared Mind Trimmer atlases, original-audio actions, detail images and both gallery portraits.')

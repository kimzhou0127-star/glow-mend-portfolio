"""Prepare local character assets. Originals remain untouched."""
import sys, subprocess, pathlib, json
root=pathlib.Path(__file__).resolve().parents[1]
from PIL import Image, ImageOps
from media_config import ff, source_root
source=source_root
out=root/'public/assets/characters'
motion=out/'shield-soother'
(motion/'look-v2').mkdir(parents=True,exist_ok=True)
def image(folder,name,dest,size):
 im=ImageOps.exif_transpose(Image.open(source/folder/name)).convert('RGB'); im.thumbnail(size)
 im.save(out/dest,'WEBP',quality=90)
image('角色1','角色1-1.png','character-1-detail-small.webp',(1100,700))
image('角色1','角色1-2.jpg','character-1-detail-large.webp',(1400,900))
image('角色1','按钮icon.png','shield-soother/paw.webp',(180,180))
# Four 3840 × 3840 atlases hold 192 source-rate frames; decoded pixels = 225 MiB.
subprocess.run([ff,'-v','error','-i',str(source/'角色1/头部环绕.mp4'),'-vf','fps=24,scale=480:640,tile=8x6','-frames:v','4','-c:v','libwebp','-quality','88','-start_number','0','-y',str(motion/'look-v2/atlas-%d.webp')],check=True)
subprocess.run([ff,'-v','error','-i',str(source/'角色1/头部环绕.mp4'),'-vf','scale=480:640','-frames:v','1','-c:v','libwebp','-quality','90','-y',str(motion/'look-v2/poster.webp')],check=True)
for name,filename in [('摸头','head'),('摸手','hand'),('摸裤子','trousers')]:
 subprocess.run([ff,'-v','error','-i',str(source/'角色1'/f'{name}.mp4'),'-map','0:v:0','-map','0:a:0','-vf','scale=720:960:force_original_aspect_ratio=decrease,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-y',str(motion/f'{filename}.mp4')],check=True)
print('Prepared 4 complete 24fps look atlases (225 MiB decoded) and 3 action videos with original audio')

"""Local, optional media preparation settings; never needed for website builds."""
import os
import shutil
from pathlib import Path

source_dir = os.environ.get("CHARACTER_SOURCE_DIR")
if not source_dir:
    raise SystemExit("Set CHARACTER_SOURCE_DIR to the folder containing 角色1, 角色2 and 角色3.")
source_root = Path(source_dir).expanduser()
if not source_root.is_dir():
    raise SystemExit("CHARACTER_SOURCE_DIR is not a directory.")
ff = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg")
if not ff:
    raise SystemExit("Install FFmpeg or set FFMPEG_BIN to its executable path.")

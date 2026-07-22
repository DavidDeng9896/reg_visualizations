import sys, os, glob
import numpy as np
from PIL import Image, ImageDraw

D = "/Users/liweideng/GitHub/reg_visualizations/docs/reference/raw/images"
F = os.path.join(D, "frames")
FF = "/Users/liweideng/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/python/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"

gif = sys.argv[1]
fps = sys.argv[2] if len(sys.argv) > 2 else "0.5"
maxk = int(sys.argv[3]) if len(sys.argv) > 3 else 15
stem = gif[:-4]
outdir = os.path.join(F, stem)
os.makedirs(outdir, exist_ok=True)
for p in glob.glob(os.path.join(outdir, "u_*.png")):
    os.remove(p)

os.system(f'"{FF}" -hide_banner -loglevel error -i "{D}/{gif}" -vf fps={fps} "{outdir}/u_%04d.png"')
frames = sorted(glob.glob(os.path.join(outdir, "u_*.png")))
n = len(frames)
# dedupe near-identical consecutive frames
keep = []
prev = None
for p in frames:
    a = np.asarray(Image.open(p).convert("L").resize((160, 90)), dtype=np.int16)
    if prev is None or np.abs(a - prev).mean() > 0.8:
        keep.append(p)
        prev = a
# uniform subsample to maxk
if len(keep) > maxk:
    idxs = np.linspace(0, len(keep) - 1, maxk).round().astype(int)
    keep = [keep[i] for i in idxs]
W, H = Image.open(keep[0]).size
tw = 900 if W >= 1900 else 620
th = int(H * tw / W)
cols = 3
rows = (len(keep) + cols - 1) // cols
mont = Image.new("RGB", (cols * (tw + 10) + 10, rows * (th + 38) + 10), (200, 200, 200))
for i, p in enumerate(keep):
    fr = Image.open(p).convert("RGB")
    t = fr.resize((tw, th))
    c = Image.new("RGB", (tw, th + 28), "white")
    c.paste(t, (0, 28))
    d = ImageDraw.Draw(c)
    d.rectangle([0, 0, tw, 27], fill=(20, 20, 20))
    d.text((8, 6), f"{stem}  {os.path.basename(p)}", fill="white")
    r, cc = divmod(i, cols)
    mont.paste(c, (10 + cc * (tw + 10), 10 + r * (th + 38)))
mont.save(os.path.join(F, f"{stem}_montage.png"))
print(gif, "extracted:", n, "kept:", len(keep), [os.path.basename(p) for p in keep])

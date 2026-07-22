import sys, os
import numpy as np
from PIL import Image, ImageDraw

D = "/Users/liweideng/GitHub/reg_visualizations/docs/reference/raw/images"
F = os.path.join(D, "frames")

gif = sys.argv[1]
stride = int(sys.argv[2]) if len(sys.argv) > 2 else 4
k = int(sys.argv[3]) if len(sys.argv) > 3 else 12

im = Image.open(os.path.join(D, gif))
n = im.n_frames
W, H = im.size

# Phase 1: scan with stride, decode-only small thumbnails
idxs = list(range(0, n, stride))
if idxs[-1] != n - 1:
    idxs.append(n - 1)
diffs = np.zeros(len(idxs))
prev = None
im.seek(0)
cur = 0
for j, i in enumerate(idxs):
    if i > cur:
        im.seek(i)
        cur = i
    fr = im.copy()
    small = np.asarray(fr.convert("P").resize((160, 90)).convert("L"), dtype=np.int16)
    if prev is not None:
        diffs[j] = np.abs(small - prev).mean()
    prev = small

# Phase 2: select keyframe positions (index into idxs)
sel_js = {0, len(idxs) - 1}
cum = np.cumsum(diffs)
total = cum[-1]
if total > 0:
    for q in range(1, k - 1):
        target = total * q / (k - 1)
        jj = int(np.searchsorted(cum, target))
        jj = min(jj, len(idxs) - 1)
        w = diffs[max(0, jj - 2):min(len(idxs), jj + 3)]
        if w.size:
            jj = max(0, jj - 2) + int(np.argmax(w))
        sel_js.add(min(jj + 1, len(idxs) - 1))
else:
    sel_js |= {int(t * (len(idxs) - 1) / (k - 1)) for t in range(k)}
sel = sorted(idxs[j] for j in sorted(sel_js))

# Phase 3: save full-res selected frames + montage
stem = gif[:-4]
outdir = os.path.join(F, stem)
os.makedirs(outdir, exist_ok=True)
tw = 900 if W >= 1900 else 620
th = int(H * tw / W)
thumbs = []
im.seek(0)
cur = 0
for idx in sel:
    if idx > cur:
        im.seek(idx)
        cur = idx
    fr = im.convert("RGB")
    fr.save(os.path.join(outdir, f"f{idx:04d}.png"))
    t = fr.resize((tw, th))
    c = Image.new("RGB", (tw, th + 28), "white")
    c.paste(t, (0, 28))
    d = ImageDraw.Draw(c)
    d.rectangle([0, 0, tw, 27], fill=(20, 20, 20))
    d.text((8, 6), f"{stem}  frame {idx}", fill="white")
    thumbs.append(c)

cols = 3
rows = (len(thumbs) + cols - 1) // cols
mont = Image.new("RGB", (cols * (tw + 10) + 10, rows * (th + 38) + 10), (200, 200, 200))
for i, t in enumerate(thumbs):
    r, cc = divmod(i, cols)
    mont.paste(t, (10 + cc * (tw + 10), 10 + r * (th + 38)))
mont.save(os.path.join(F, f"{stem}_montage.png"))
print(gif, "n=", n, "selected:", sel)

"""Trace the two photos into white silhouettes (SVG paths in a 390×100 box)."""
import cv2, numpy as np
from PIL import Image

OUT = '/tmp/claude-0/-home-claude/5e0b2550-d593-5a2c-b43a-8008e9878147/scratchpad/sil/'

def contours_to_path(mask, scale, ox=0, oy=0, eps=1.2, min_area=30):
    """Outer contours + holes (evenodd) → SVG path string in target coordinates."""
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    parts = []
    for c in cs:
        if cv2.contourArea(c) < min_area: continue
        a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(a) < 3: continue
        pts = [(round(x * scale + ox, 1), round(y * scale + oy, 1)) for x, y in a]
        parts.append('M' + ' L'.join(f'{x} {y}' for x, y in pts) + ' Z')
    return ' '.join(parts)

def clean(mask, k=3, it=1):
    ker = np.ones((k, k), np.uint8)
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, ker, iterations=it)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ker, iterations=it)
    return m

# ─── Vertières: dark bronze figures + flag against sky, standing on the rock ──────────────────
im = np.array(Image.open('vertieres.webp').convert('RGB')).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
lum = (R * 299 + G * 587 + B * 114) // 1000
H, W = lum.shape
# figures: dark; flag: saturated red/blue; exclude the green trees (G dominant) and the light rock
dark = (lum < 88) & ~(B > R + 25)
flagbox = np.zeros_like(dark); flagbox[20:135, 650:735] = True
flag = (((R > 110) & (R > G + 50) & (R > B + 30)) | ((B > 80) & (B > R + 50) & (B > G + 40) & (lum < 130))) & flagbox
green = (G > R + 12) & (G > B + 12)
mask = (dark & ~green) | flag
# region of the statue group only; the rock below is light but its shadows are not, so stop at y 440
reg = np.zeros_like(mask); reg[90:440, 120:885] = True; reg[20:135, 650:735] = True
mask &= reg
# flagpole: thin bright line — keep by drawing it ourselves (pole from the flag's base to the rock)
mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
# keep only components touching the group (drop specks)
n, lab, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
keep = np.zeros_like(mask)
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] > 400: keep |= lab == i
mask = keep
# target box: figures span the middle of a 390×100 box, feet on y≈78, rock mound under them
scale = 390 / W * 0.78
ox = (390 - W * scale) / 2
oy = 100 - 480 * scale - 20   # feet (~y 470 px in photo) land near y 78
fig = contours_to_path(mask, scale, ox, oy)
# flagpole + rock mound drawn as simple shapes under/behind the group
fx = ox + 708 * scale
pole = f'M{fx-0.7:.1f} {oy+10*scale:.1f} L{fx+0.7:.1f} {oy+10*scale:.1f} L{fx+0.7:.1f} {oy+480*scale:.1f} L{fx-0.7:.1f} {oy+480*scale:.1f} Z'
mound = 'M0 100 L0 94 Q30 90 60 84 Q110 70 150 74 Q200 70 240 73 Q300 70 330 80 Q360 88 390 94 L390 100 Z'
open(OUT + 'vertieres.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 100" width="390" height="100"><g fill="#FFFFFF" fill-rule="evenodd"><path d="{mound}"/><path d="{pole}"/><path d="{fig}"/></g></svg>')
print('vertieres figure path', len(fig))

# ─── Citadelle: the skyline (fortress + hill) with the gun ports cut out ─────────────────────
im = np.array(Image.open('citadelle.webp').convert('RGB')).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
lum = (R * 299 + G * 587 + B * 114) // 1000
H, W = lum.shape
neutral = (np.abs(R - G) < 18) & (np.abs(G - B) < 25)
sky = (neutral & (lum > 140)) | ((B > R) & (lum > 110))   # clouds (neutral bright), blue sky, hazy far mountains — not sunlit red walls or yellow foliage
fort = (R > G + 15) & (lum < 170) & (lum > 25)           # red-brown masonry
hill = (G > R + 8) & (lum < 170)                          # vegetation
solid = ~sky
# restrict to the central mountain (x 300–1350) so the far ranges left/right are not traced
sky_band = sky.copy(); sky_band[:, :300] = True; sky_band[:, 1350:] = True
# skyline: per column, the first solid run of >= 60 px scanning down from the top (cloud specks are shorter)
solid_band = ~sky_band
run = np.zeros_like(solid_band, dtype=np.int32)
for y in range(1, H): run[y] = np.where(solid_band[y], run[y - 1] + 1, 0)
sil = np.zeros_like(solid, dtype=bool)
for x in range(300, 1350):
    ys = np.where(run[:, x] >= 60)[0]
    if len(ys): sil[ys[0] - 59:, x] = True
sil = cv2.morphologyEx(sil.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
# gun ports: very dark small blobs inside the fortress walls
ports = (lum < 45) & fort.astype(bool)
ports = clean(ports, 3, 1)
n, lab, stats, _ = cv2.connectedComponentsWithStats(ports.astype(np.uint8), 8)
holes = np.zeros_like(ports)
for i in range(1, n):
    a = stats[i, cv2.CC_STAT_AREA]; w = stats[i, cv2.CC_STAT_WIDTH]; h = stats[i, cv2.CC_STAT_HEIGHT]
    if 40 < a < 900 and w < 45 and h < 45: holes |= lab == i
final = sil & ~holes.astype(bool)
# target: crop the mountain band x 300–1350, y 200–853 → fit width 390, bottom at y 100
x0, x1, y0, y1 = 300, 1350, 212, 482   # 1050×270 → 390×100
crop = final[y0:y1, x0:x1]
scale = 390 / (x1 - x0)
oy = 100 - crop.shape[0] * scale
path = contours_to_path(crop, scale, 0, oy, eps=1.0, min_area=6)
open(OUT + 'citadelle.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 100" width="390" height="100"><path fill="#FFFFFF" fill-rule="evenodd" d="{path}"/></svg>')
print('citadelle path', len(path))
Image.fromarray((final * 255).astype(np.uint8)).save(OUT + 'citadelle-mask.png')
Image.fromarray((mask * 255).astype(np.uint8)).save(OUT + 'vertieres-mask.png')

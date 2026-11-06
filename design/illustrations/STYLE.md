# Konesans illustration style (course pictures + unit badges)

Every picture must look like it belongs to the same set as the app icons (`apps/mobile/src/ui/icons.ts`, `design/iconset/*.svg`) and the mascot Ti Zwazo. Read 5–6 of those SVGs before drawing.

## Canvas
- `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` — no width/height attributes, no `<style>`, no `<text>` (except digits for numbers), no gradients, no filters, no external refs, no `id`s.
- Keep the subject inside an 80×80 safe area centred (8px margin). One clear subject, centred, filling the area — it is shown as a 72–120 px tile on a phone.
- Under 6 KB per file. Hand-written paths/shapes (circle, ellipse, rect rx, path with simple curves). Coordinates rounded to 1 decimal.

## Line and colour
- Outline: `stroke="#14213D"` (navy), `stroke-width="3"` (2.5 for small details), `stroke-linejoin="round"` `stroke-linecap="round"`. Every filled shape is outlined.
- Flat fills only, from this palette:
  - Blue `#4D7CFE` · deep blue `#1F47B5` · light blue `#E6ECFB`
  - Red `#FF5A6E` · Haiti red `#D21034` · light red `#FDE7EC`
  - Yellow `#FFD43B` · gold `#F5B700` · light yellow `#FFF4D1`
  - Green `#51CF66` · deep green `#2F9E44` · light green `#E3F4EA`
  - Orange `#FF9F43` · purple `#B197FC` · brown `#8B5A2B` · light brown `#C68B59`
  - White `#FFFFFF` · grey `#D9DEEA` · navy `#14213D`
- One small white highlight (a short curved stroke or a dot) on round objects is welcome, like the icons.
- No background square: transparent background. A soft ground shadow is allowed: `<ellipse … fill="#14213D" opacity=".08"/>` under standing things.

## People (very important — they must look like one family of characters)
- Haitian kids and adults. Skin tones (fill): `#8D5524`, `#A0663A`, `#C68642`, `#5C3A1E` — vary across people.
- Head: circle r≈16–18 (kids larger head-to-body), ears small half-circles. Eyes: two filled navy dots r=2.2 with a tiny white dot. Smile: one navy curve. Cheeks: optional `#FF5A6E` dots at opacity .35.
- Hair: short (cap shape), afro (bumpy circle), puffs (two balls), braids (two lines with beads). Hair fill `#14213D` or `#3B2412`.
- Clothes: simple rounded torso shapes in palette colours; school uniform = light blue `#E6ECFB` shirt with navy collar. No text on clothes.
- Elders: grey hair `#D9DEEA`, optional round glasses. Babies: big head, onesie, no hair or one curl.
- Friendly, respectful, no stereotypes, no weapons, no religious symbols, no brand logos.

## Haitian touch where it fits
Market scenes with a madras-pattern headscarf (`#D21034`/`#FFD43B` squares), tap-tap colours on the bus, mango and plantain shapes. Nothing with alcohol or tobacco. Houses: gingerbread-style pastel house with a roof trim. Hospital: white cross on red is fine (not religious).

## Concepts that are not objects
Draw a clear, kid-readable scene with one character (same character spec), e.g. `hungry` = kid holding belly with an empty plate, `thirsty` = kid with a drop bubble, `learn` = kid with book and a lightbulb, `calendar_next` = calendar page with a green arrow right, `please` = kid with hands together and a small heart.

## Checking your work
Render a contact sheet: a small HTML page with all your SVGs at 96 px and 48 px in a grid, screenshot it with Playwright (`playwright-core`, executablePath `/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`), and look at it with the Read tool. Fix anything unclear at 48 px, off-centre, inconsistent with the icons, or missing outlines. Validate each file parses as XML (`node -e "new (require('@xmldom/xmldom')...)"` is not installed — use a regex sanity check plus loading it in the browser page and checking `img.naturalWidth > 0`).

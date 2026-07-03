"""One-off: render the Pipeline app icon to PNGs via headless Chromium.

Usage: python scripts/make-icons.py
Writes public/icons/pwa-192.png, pwa-512.png, maskable-512.png.
"""
import pathlib
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# Dark neutral tile, emerald "P" — matches the app's dark theme.
def html(size: int, maskable: bool) -> str:
    radius = 0 if maskable else size * 0.22
    # Maskable icons need ~20% safe zone, so shrink the glyph
    font = size * (0.42 if maskable else 0.52)
    return f"""
    <html><body style="margin:0">
    <div style="width:{size}px;height:{size}px;border-radius:{radius}px;
                background:#17181b;display:flex;align-items:center;justify-content:center;
                font-family:'Segoe UI',system-ui,sans-serif">
      <span style="color:#34d399;font-size:{font}px;font-weight:700;line-height:1">P</span>
    </div></body></html>"""

TARGETS = [("pwa-192.png", 192, False), ("pwa-512.png", 512, False), ("maskable-512.png", 512, True)]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for name, size, maskable in TARGETS:
        page = browser.new_page(viewport={"width": size, "height": size})
        page.set_content(html(size, maskable))
        page.locator("div").screenshot(path=str(OUT / name), omit_background=not maskable)
        page.close()
    browser.close()

print("Wrote", ", ".join(t[0] for t in TARGETS), "to", OUT)

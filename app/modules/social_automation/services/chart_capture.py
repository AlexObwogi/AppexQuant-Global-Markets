"""TradingView Automated Screen Capture and 9:16 Vertical Story Formatter.

Uses Playwright for headless browser automation across multiple timeframes,
and Pillow (PIL) for compositing into branded 9:16 (1080x1920) social canvases.
"""

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from ..config import settings


class TradingViewCaptureService:
    """Automates headless Chromium capture of TradingView charts and pads to 9:16 social templates."""

    TIMEFRAME_SELECTOR_MAP: Dict[str, str] = {
        "1m": "button#header-toolbar-intervals div:has-text('1m'), button[data-value='1']",
        "5m": "button#header-toolbar-intervals div:has-text('5m'), button[data-value='5']",
        "15m": "button#header-toolbar-intervals div:has-text('15m'), button[data-value='15']",
        "30m": "button#header-toolbar-intervals div:has-text('30m'), button[data-value='30']",
        "1h": "button#header-toolbar-intervals div:has-text('1h'), button[data-value='60']",
        "4h": "button#header-toolbar-intervals div:has-text('4h'), button[data-value='240']",
        "1D": "button#header-toolbar-intervals div:has-text('1D'), button[data-value='1D']",
    }

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir or settings.MEDIA_STORAGE_DIR) / "captures"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.brand_dir = Path(settings.BRAND_ASSETS_DIR)

    async def capture_chart_timeframes(
        self,
        symbol: str,
        timeframes: List[str],
        format_9_16: bool = True,
        layout_url: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """Captures clean PNG screenshots for requested timeframes and optionally formats to 9:16.

        Returns a list of dicts with:
        [{"timeframe": "1h", "raw_path": "...", "final_path": "...", "symbol": symbol}]
        """
        results: List[Dict[str, str]] = []
        base_url = layout_url or f"https://www.tradingview.com/chart/?symbol={symbol}"

        async with async_playwright() as p:
            browser: Browser = await p.chromium.launch(
                headless=settings.PLAYWRIGHT_HEADLESS,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--disable-gpu",
                ]
            )

            # High DPI viewport for crisp chart lines
            context: BrowserContext = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=2
            )

            page: Page = await context.new_page()

            try:
                # Login if credentials are provided in settings
                await self._authenticate_if_needed(page)

                await page.goto(base_url, wait_until="networkidle", timeout=45000)

                # Dismiss dialogs / cookie consent if present
                await self._dismiss_popups(page)

                # Wait for chart canvas to fully stabilize
                await page.wait_for_selector("div.chart-gui-wrapper, canvas", timeout=30000)
                await asyncio.sleep(2.0)

                timestamp_slug = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                clean_symbol = symbol.replace(":", "_").replace("/", "_")

                for tf in timeframes:
                    raw_filename = f"{clean_symbol}_{tf}_{timestamp_slug}_raw.png"
                    raw_path = self.output_dir / raw_filename

                    # Switch timeframe via shortcut or toolbar
                    await self._switch_timeframe(page, tf)
                    await asyncio.sleep(2.5)  # Allow candles to re-render

                    # Locate chart container to take an un-occluded clean screenshot
                    chart_element = page.locator("div.chart-gui-wrapper").first
                    if await chart_element.count() > 0:
                        await chart_element.screenshot(path=str(raw_path))
                    else:
                        await page.screenshot(path=str(raw_path))

                    final_path = raw_path
                    if format_9_16:
                        formatted_filename = f"{clean_symbol}_{tf}_{timestamp_slug}_9x16.png"
                        formatted_path = self.output_dir / formatted_filename
                        self.pad_to_9_16_canvas(
                            raw_image_path=str(raw_path),
                            output_path=str(formatted_path),
                            symbol=symbol,
                            timeframe=tf
                        )
                        final_path = formatted_path

                    results.append({
                        "timeframe": tf,
                        "symbol": symbol,
                        "raw_path": str(raw_path),
                        "final_path": str(final_path),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

            finally:
                await context.close()
                await browser.close()

        return results

    async def _authenticate_if_needed(self, page: Page) -> None:
        """Logs into TradingView if pro account credentials are provided."""
        if settings.TRADINGVIEW_USERNAME and settings.TRADINGVIEW_PASSWORD:
            try:
                await page.goto("https://www.tradingview.com/#signin", timeout=25000)
                # Click email sign-in option
                email_btn = page.locator("button.emailButton-n5cTfZGm, span:has-text('Email')")
                if await email_btn.count() > 0:
                    await email_btn.first.click()
                    await page.fill("input[name='id_username']", settings.TRADINGVIEW_USERNAME)
                    await page.fill("input[name='id_password']", settings.TRADINGVIEW_PASSWORD)
                    await page.click("button[type='submit']")
                    await page.wait_for_timeout(3000)
            except Exception:
                # Fallback to public layout view if login fails or is already authenticated
                pass

    async def _dismiss_popups(self, page: Page) -> None:
        """Dismiss common TradingView modal dialogues, cookie banners, or trial banners."""
        popup_selectors = [
            "button[aria-label='Close']",
            "button:has-text('Accept all cookies')",
            "button:has-text('I accept')",
            "div.tv-dialog__close",
            "button.close-button"
        ]
        for sel in popup_selectors:
            try:
                btns = page.locator(sel)
                if await btns.count() > 0:
                    await btns.first.click(timeout=1000)
            except Exception:
                pass

    async def _switch_timeframe(self, page: Page, timeframe: str) -> None:
        """Uses keyboard shortcuts or interval buttons to reliably switch timeframe."""
        tf_shortcut = {
            "1m": "1",
            "5m": "5",
            "15m": "15",
            "30m": "30",
            "1h": "60",
            "4h": "240",
            "1D": "1D"
        }.get(timeframe, timeframe)

        try:
            # Click on chart body to focus
            await page.mouse.click(500, 500)
            # Type shortcut and hit Enter (native TradingView interval jump)
            await page.keyboard.type(tf_shortcut, delay=50)
            await page.keyboard.press("Enter")
        except Exception:
            # Fallback to clicking selector if mapped
            sel = self.TIMEFRAME_SELECTOR_MAP.get(timeframe)
            if sel:
                btn = page.locator(sel).first
                if await btn.count() > 0:
                    await btn.click()

    def pad_to_9_16_canvas(
        self,
        raw_image_path: str,
        output_path: str,
        symbol: str,
        timeframe: str,
        target_size: Tuple[int, int] = (1080, 1920)
    ) -> str:
        """Pads a horizontal screenshot into a 9:16 vertical canvas with AppexQuant branding."""
        target_w, target_h = target_size

        # 1. Base dark theme background canvas with subtle gradient aesthetic
        canvas = Image.new("RGBA", (target_w, target_h), (11, 15, 25, 255))
        draw = ImageDraw.Draw(canvas)

        # 2. Open raw chart
        chart = Image.open(raw_image_path).convert("RGBA")

        # 3. Create a soft ambient blurred background from the chart itself
        bg_blur = chart.resize((target_w, target_h), Image.Resampling.LANCZOS)
        bg_blur = bg_blur.filter(ImageFilter.GaussianBlur(radius=45))
        # Darken blurred background
        dark_overlay = Image.new("RGBA", (target_w, target_h), (11, 15, 25, 215))
        canvas.paste(bg_blur, (0, 0))
        canvas.paste(dark_overlay, (0, 0), dark_overlay)

        # 4. Scale chart to fit safely within horizontal bounds (1000px wide, leaving 40px side margins)
        avail_w = target_w - 80
        aspect = chart.height / chart.width
        new_chart_w = avail_w
        new_chart_h = int(new_chart_w * aspect)

        # Cap height if aspect ratio is unusually tall
        if new_chart_h > 1050:
            new_chart_h = 1050
            new_chart_w = int(new_chart_h / aspect)

        chart_resized = chart.resize((new_chart_w, new_chart_h), Image.Resampling.LANCZOS)

        # 5. Position chart vertically in the optical center (safe from Reels/TikTok UI)
        # Reel safe zones: Top 150px reserved for profile/sound, Bottom 320px for captions/buttons
        chart_x = (target_w - new_chart_w) // 2
        chart_y = 360 + ((1180 - new_chart_h) // 2)

        # Draw subtle border/frame around chart
        border_box = [
            chart_x - 3,
            chart_y - 3,
            chart_x + new_chart_w + 3,
            chart_y + new_chart_h + 3
        ]
        draw.rounded_rectangle(border_box, radius=16, outline=(42, 53, 79, 255), width=2)

        # Paste chart
        canvas.paste(chart_resized, (chart_x, chart_y), chart_resized)

        # 6. Render Brand Header (Top Safe Area: Y: 140 to 320)
        self._render_brand_header(draw, target_w, symbol, timeframe)

        # 7. Render Brand Footer / Metrics Card (Bottom Area: Y: 1560 to 1750)
        self._render_brand_footer(draw, target_w, target_h)

        # Save finalized 9:16 asset
        canvas.convert("RGB").save(output_path, format="PNG", quality=95)
        return output_path

    def _render_brand_header(
        self,
        draw: ImageDraw.ImageDraw,
        canvas_w: int,
        symbol: str,
        timeframe: str
    ) -> None:
        """Renders the top branding header with ticker badge and timestamp."""
        try:
            font_title = ImageFont.truetype("DejaVuSans-Bold.ttf", 46)
            font_badge = ImageFont.truetype("DejaVuSans-Bold.ttf", 32)
            font_sub = ImageFont.truetype("DejaVuSans.ttf", 26)
        except Exception:
            font_title = ImageFont.load_default()
            font_badge = font_title
            font_sub = font_title

        # Brand name
        brand_text = "APPEXQUANT MARKETS"
        draw.text((60, 160), brand_text, fill=(240, 244, 250), font=font_title)

        # Category eyebrow
        sub_text = "INSTITUTIONAL QUANTITATIVE RADAR"
        draw.text((62, 220), sub_text, fill=(110, 130, 165), font=font_sub)

        # Pill badge for Symbol & Timeframe (Right aligned)
        pill_text = f"{symbol}  •  {timeframe.upper()}"
        pill_w = 400
        pill_h = 56
        pill_x1 = canvas_w - 60 - pill_w
        pill_y1 = 160
        pill_x2 = pill_x1 + pill_w
        pill_y2 = pill_y1 + pill_h

        draw.rounded_rectangle(
            [pill_x1, pill_y1, pill_x2, pill_y2],
            radius=28,
            fill=(25, 34, 52, 255),
            outline=(59, 130, 246, 255),
            width=2
        )
        draw.text((pill_x1 + 30, pill_y1 + 10), pill_text, fill=(255, 255, 255), font=font_badge)

    def _render_brand_footer(
        self,
        draw: ImageDraw.ImageDraw,
        canvas_w: int,
        canvas_h: int
    ) -> None:
        """Renders the bottom safe-area footer badge and disclaimers."""
        try:
            font_footer = ImageFont.truetype("DejaVuSans-Bold.ttf", 28)
            font_disc = ImageFont.truetype("DejaVuSans.ttf", 20)
        except Exception:
            font_footer = ImageFont.load_default()
            font_disc = font_footer

        card_x1 = 60
        card_y1 = canvas_h - 280
        card_x2 = canvas_w - 60
        card_y2 = canvas_h - 170

        draw.rounded_rectangle(
            [card_x1, card_y1, card_x2, card_y2],
            radius=18,
            fill=(18, 24, 38, 240),
            outline=(35, 46, 70, 255),
            width=1
        )

        draw.text(
            (card_x1 + 30, card_y1 + 22),
            "⚡ AppexQuant Autonomous Signals",
            fill=(56, 189, 248),
            font=font_footer
        )
        draw.text(
            (card_x1 + 30, card_y1 + 65),
            "AI Algorithmic Execution • Non-discretionary Trade Intelligence",
            fill=(156, 163, 175),
            font=font_disc
        )

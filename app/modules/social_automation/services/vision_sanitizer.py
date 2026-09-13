"""Telegram Scraper and Computer Vision Media Sanitizer Sub-Service.

Features:
- Telethon userbot listener for automated channel monitoring.
- Regular expression heuristics to purge links, affiliate handles, and spam copy.
- OpenCV (cv2) bounding box detection for corner watermarks/logos with dynamic in-painting and AppexQuant branding replacement.
"""

import asyncio
import os
import re
from pathlib import Path
from typing import Optional, Tuple, Callable, List

import cv2
import numpy as np
from telethon import TelegramClient, events
from telethon.sessions import StringSession

from ..config import settings


class TextSanitizer:
    """Purges promotional artifacts, referral handles, t.me links, and spam from signal text."""

    URL_REGEX = re.compile(r"https?://(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*")
    TELEGRAM_LINK_REGEX = re.compile(r"(?:https?://)?t\.me/(?:joinchat/)?[\w+_-]+", re.IGNORECASE)
    TELEGRAM_HANDLE_REGEX = re.compile(r"(?:^|(?<=\s))@([a-zA-Z0-9_]{4,32})", re.IGNORECASE)

    PROMOTIONAL_PATTERNS = [
        re.compile(r"(?:join|subscribe|dm|contact)\s+(?:our|my|the)?\s*(?:vip|premium|channel|admin).*", re.IGNORECASE),
        re.compile(r"(?:discount|lifetime|guaranteed|passwords?|giveaway|bonus).*", re.IGNORECASE),
        re.compile(r"(?:signals?\s+by|managed\s+by|copyright|all\s+rights\s+reserved).*", re.IGNORECASE),
        re.compile(r"👉.*t\.me.*", re.IGNORECASE),
        re.compile(r"📲.*whatsapp.*", re.IGNORECASE),
    ]

    @classmethod
    def clean_text(cls, raw_text: Optional[str]) -> str:
        """Sanitizes incoming message text into clean, branded AppexQuant signal copy."""
        if not raw_text:
            return ""

        text = raw_text

        # 1. Remove Telegram direct links & standard web links
        text = cls.TELEGRAM_LINK_REGEX.sub("", text)
        text = cls.URL_REGEX.sub("", text)

        # 2. Strip external handles (@promoter, @competitor)
        text = cls.TELEGRAM_HANDLE_REGEX.sub("", text)

        # 3. Strip promotional sentences line-by-line
        cleaned_lines: List[str] = []
        for line in text.splitlines():
            line_str = line.strip()
            if not line_str:
                cleaned_lines.append("")
                continue

            is_promo = any(pattern.search(line_str) for pattern in cls.PROMOTIONAL_PATTERNS)
            if not is_promo:
                cleaned_lines.append(line_str)

        cleaned_text = "\n".join(cleaned_lines)

        # 4. Collapse multiple empty lines
        cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text).strip()

        # 5. Append AppexQuant signature header/footer if meaningful content remains
        if cleaned_text:
            cleaned_text = f"📊 [AppexQuant Market Intelligence]\n\n{cleaned_text}\n\n⚡ Automated Execution by AppexQuant AI"

        return cleaned_text


class VisionSanitizerService:
    """Performs OpenCV corner logo detection, inpainting, and dynamic watermark placement."""

    def __init__(self, brand_logo_path: Optional[str] = None):
        self.brand_logo_path = brand_logo_path or os.path.join(
            settings.BRAND_ASSETS_DIR, "appexquant_watermark.png"
        )

    def sanitize_and_watermark_image(
        self,
        input_image_path: str,
        output_image_path: str,
        corner_patch_ratio: float = 0.16
    ) -> str:
        """Detects high-contrast text/logo patches in the 4 corners, in-paints them, and applies AppexQuant watermark."""
        img = cv2.imread(input_image_path)
        if img is None:
            raise ValueError(f"Unable to read image at path: {input_image_path}")

        h, w, _ = img.shape

        # Define candidate corner regions (top-left, top-right, bottom-left, bottom-right)
        cw = int(w * corner_patch_ratio)
        ch = int(h * corner_patch_ratio)

        corner_rois = [
            (0, 0, cw, ch),                 # Top-Left
            (w - cw, 0, w, ch),             # Top-Right
            (0, h - ch, cw, h),             # Bottom-Left
            (w - cw, h - ch, w, h),         # Bottom-Right
        ]

        mask = np.zeros((h, w), dtype=np.uint8)

        # Detect high-variance / text edge contours inside corner ROIs
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        for x1, y1, x2, y2 in corner_rois:
            roi_gray = gray[y1:y2, x1:x2]
            # Use Sobel gradient and thresholding to identify dense graphic logos or text
            grad_x = cv2.Sobel(roi_gray, cv2.CV_16S, 1, 0, ksize=3)
            grad_y = cv2.Sobel(roi_gray, cv2.CV_16S, 0, 1, ksize=3)
            abs_grad_x = cv2.convertScaleAbs(grad_x)
            abs_grad_y = cv2.convertScaleAbs(grad_y)
            grad = cv2.addWeighted(abs_grad_x, 0.5, abs_grad_y, 0.5, 0)

            _, thresh = cv2.threshold(grad, 45, 255, cv2.THRESH_BINARY)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Filter noise vs significant text/logo blocks
                if area > 120:
                    bx, by, bw, bh = cv2.boundingRect(cnt)
                    # Expand bounding box slightly for clean coverage
                    pad = 4
                    rx1 = max(0, x1 + bx - pad)
                    ry1 = max(0, y1 + by - pad)
                    rx2 = min(w, x1 + bx + bw + pad)
                    ry2 = min(h, y1 + by + bh + pad)
                    cv2.rectangle(mask, (rx1, ry1), (rx2, ry2), 255, -1)

        # Inpaint masked regions using Navier-Stokes based inpainting
        if cv2.countNonZero(mask) > 0:
            img = cv2.inpaint(img, mask, inpaintRadius=4, flags=cv2.INPAINT_NS)

        # Overlay AppexQuant Watermark in Bottom-Right or Top-Right
        img = self._apply_brand_watermark(img)

        Path(output_image_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(output_image_path, img)
        return output_image_path

    def _apply_brand_watermark(self, base_img: np.ndarray) -> np.ndarray:
        """Overlays the AppexQuant badge or fallback clean text watermark."""
        h, w, _ = base_img.shape

        if os.path.exists(self.brand_logo_path):
            watermark = cv2.imread(self.brand_logo_path, cv2.IMREAD_UNCHANGED)
            if watermark is not None:
                wm_h, wm_w = watermark.shape[:2]
                # Scale watermark to fit ~18% width
                scale = (w * 0.18) / wm_w
                new_w, new_h = int(wm_w * scale), int(wm_h * scale)
                watermark = cv2.resize(watermark, (new_w, new_h), interpolation=cv2.INTER_AREA)

                # Position in bottom-right corner with 24px margin
                pos_x = w - new_w - 24
                pos_y = h - new_h - 24

                # Alpha blend watermark overlay
                if watermark.shape[2] == 4:
                    alpha_wm = watermark[:, :, 3] / 255.0
                    alpha_base = 1.0 - alpha_wm
                    for c in range(3):
                        base_img[pos_y:pos_y+new_h, pos_x:pos_x+new_w, c] = (
                            alpha_wm * watermark[:, :, c] +
                            alpha_base * base_img[pos_y:pos_y+new_h, pos_x:pos_x+new_w, c]
                        )
                    return base_img

        # Fallback: Render vector pill badge directly via OpenCV primitives
        badge_text = "APPEXQUANT AI"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.55, w / 1600.0)
        thickness = 2
        text_size, _ = cv2.getTextSize(badge_text, font, font_scale, thickness)

        badge_w = text_size[0] + 32
        badge_h = text_size[1] + 20
        bx1 = w - badge_w - 24
        by1 = h - badge_h - 24
        bx2 = bx1 + badge_w
        by2 = by1 + badge_h

        # Semi-transparent dark pill badge
        overlay = base_img.copy()
        cv2.rectangle(overlay, (bx1, by1), (bx2, by2), (18, 24, 38), -1)
        cv2.addWeighted(overlay, 0.85, base_img, 0.15, 0, base_img)

        # Border
        cv2.rectangle(base_img, (bx1, by1), (bx2, by2), (59, 130, 246), 1)

        # Text
        text_x = bx1 + 16
        text_y = by1 + text_size[1] + 8
        cv2.putText(base_img, badge_text, (text_x, text_y), font, font_scale, (255, 255, 255), thickness, cv2.LINE_AA)

        return base_img


class TelegramChannelScraper:
    """Asynchronous Telethon client monitoring specified signals channels."""

    def __init__(
        self,
        on_signal_received: Callable[[str, List[str]], asyncio.Future]
    ):
        self.client: Optional[TelegramClient] = None
        self.on_signal_received = on_signal_received
        self.vision_sanitizer = VisionSanitizerService()
        self.download_dir = Path(settings.MEDIA_STORAGE_DIR) / "scraped"
        self.download_dir.mkdir(parents=True, exist_ok=True)

    async def start(self) -> None:
        """Initializes and starts the Telethon client."""
        if not settings.TELEGRAM_API_ID or not settings.TELEGRAM_API_HASH:
            raise ValueError("TELEGRAM_API_ID and TELEGRAM_API_HASH are required to start the userbot scraper.")

        session = StringSession(settings.TELEGRAM_SESSION_STRING) if settings.TELEGRAM_SESSION_STRING else "appexquant_scraper"
        self.client = TelegramClient(session, settings.TELEGRAM_API_ID, settings.TELEGRAM_API_HASH)

        @self.client.on(events.NewMessage)
        async def message_handler(event: events.NewMessage.Event):
            await self._handle_incoming_message(event)

        await self.client.start()
        print("[TelegramScraper] Telethon listener actively running on source channels.")

    async def _handle_incoming_message(self, event: events.NewMessage.Event) -> None:
        """Processes incoming channel messages, strips links, sanitizes media, and invokes callback."""
        source_channels = [c.strip() for c in settings.TELEGRAM_SOURCE_CHANNELS.split(",") if c.strip()]

        chat = await event.get_chat()
        chat_identifier = getattr(chat, "username", None) or str(chat.id)

        # If source channels are specified, filter strictly
        if source_channels and chat_identifier not in source_channels and str(chat.id) not in source_channels:
            return

        raw_text = event.message.message or ""
        cleaned_text = TextSanitizer.clean_text(raw_text)

        sanitized_media_paths: List[str] = []

        if event.message.media:
            raw_media_path = await event.message.download_media(file=str(self.download_dir))
            if raw_media_path:
                ext = Path(raw_media_path).suffix.lower()
                if ext in [".png", ".jpg", ".jpeg", ".webp"]:
                    sanitized_path = str(self.download_dir / f"sanitized_{Path(raw_media_path).name}")
                    try:
                        self.vision_sanitizer.sanitize_and_watermark_image(
                            input_image_path=raw_media_path,
                            output_image_path=sanitized_path
                        )
                        sanitized_media_paths.append(sanitized_path)
                    except Exception as err:
                        print(f"[VisionSanitizer] Warning: Image sanitization failed ({err}), using raw media.")
                        sanitized_media_paths.append(raw_media_path)
                else:
                    sanitized_media_paths.append(raw_media_path)

        if cleaned_text or sanitized_media_paths:
            # Trigger downstream processing pipeline
            await self.on_signal_received(cleaned_text, sanitized_media_paths)

    async def stop(self) -> None:
        if self.client:
            await self.client.disconnect()

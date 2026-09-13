"""Scraper module alias for userbot signal ingestion and computer vision processing.

Directly exports:
- TextSanitizer: High-throughput regex cleansing engine
- VisionSanitizerService: OpenCV corner detection, inpainting & watermark overlay
- TelegramScraperService: Telethon async userbot listener
"""

from .services.vision_sanitizer import (
    TextSanitizer,
    VisionSanitizerService,
    TelegramScraperService,
)

__all__ = [
    "TextSanitizer",
    "VisionSanitizerService",
    "TelegramScraperService",
]

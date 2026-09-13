"""Module aliases providing direct entry points requested in user specification:
- capturer.py -> services/chart_capture.py (TradingViewCaptureService)
- scraper.py -> services/vision_sanitizer.py (TextSanitizer, VisionSanitizerService, TelegramScraperService)
- dispatchers.py -> services/dispatchers.py (Omni-channel platform dispatchers)
- worker.py -> tasks.py (Celery tasks, beat schedule, and SocialAutomationDaemon)
"""

from .services.chart_capture import TradingViewCaptureService

__all__ = ["TradingViewCaptureService"]

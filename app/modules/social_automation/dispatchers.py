"""Dispatchers module alias directly exporting omni-channel publishing adapters."""

from .services.dispatchers import (
    BaseSocialDispatcher,
    DispatchResult,
    TelegramBotDispatcher,
    TelegramUserbotDispatcher,
    DiscordWebhookDispatcher,
    MetaInstagramDispatcher,
    MetaFacebookDispatcher,
    TikTokDispatcher,
    SnapchatDispatcher,
    WhatsAppBusinessDispatcher,
    get_dispatcher_for_platform,
    escape_markdown_v2,
)

__all__ = [
    "BaseSocialDispatcher",
    "DispatchResult",
    "TelegramBotDispatcher",
    "TelegramUserbotDispatcher",
    "DiscordWebhookDispatcher",
    "MetaInstagramDispatcher",
    "MetaFacebookDispatcher",
    "TikTokDispatcher",
    "SnapchatDispatcher",
    "WhatsAppBusinessDispatcher",
    "get_dispatcher_for_platform",
    "escape_markdown_v2",
]

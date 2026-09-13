"""Omni-Channel Multi-Platform Dispatchers.

Provides asynchronous, modular publishing classes with exponential backoff
retries across Telegram, Discord, Meta Graph (IG & FB), TikTok, Snapchat, and WhatsApp.
"""

import abc
import asyncio
import json
import mimetypes
import os
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import logging

from ..models import PlatformType, ConnectedChannel

logger = logging.getLogger(__name__)


def escape_markdown_v2(text: str) -> str:
    """Escapes Telegram MarkdownV2 reserved characters: _ * [ ] ( ) ~ ` > # + - = | { } . !"""
    reserved = r"_*[]()~`>#+-=|{}.!"
    escaped = []
    for char in text:
        if char in reserved:
            escaped.append(f"\\{char}")
        else:
            escaped.append(char)
    return "".join(escaped)


class DispatchResult:
    """Standardized response from an external platform dispatch."""

    def __init__(
        self,
        success: bool,
        platform_post_id: Optional[str] = None,
        response_payload: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        rate_limit_reset: Optional[int] = None,
    ):
        self.success = success
        self.platform_post_id = platform_post_id
        self.response_payload = response_payload or {}
        self.error_message = error_message
        self.rate_limit_reset = rate_limit_reset


class BaseSocialDispatcher(abc.ABC):
    """Abstract base class for platform-specific publishers."""

    def __init__(self, channel: ConnectedChannel):
        self.channel = channel
        self.credentials: Dict[str, Any] = channel.encrypted_credentials or {}
        self.settings: Dict[str, Any] = channel.settings_metadata or {}

    @abc.abstractmethod
    async def publish(
        self,
        content: str,
        media_paths: List[str]
    ) -> DispatchResult:
        """Publishes content and media to the destination channel."""
        pass


# ---------------------------------------------------------------------------
# 1. Telegram Bot API Dispatcher
# ---------------------------------------------------------------------------
class TelegramDispatcher(BaseSocialDispatcher):
    """Dispatches media groups (albums) and Markdown messages to Telegram channels/chats."""

    API_BASE = "https://api.telegram.org"

    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=2, max=16),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True
    )
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        token = self.credentials.get("bot_token")
        chat_id = self.channel.account_identifier

        if not token or not chat_id:
            return DispatchResult(False, error_message="Missing Telegram bot_token or chat_id.")

        url = f"{self.API_BASE}/bot{token}"

        async with httpx.AsyncClient(timeout=45.0) as client:
            # Case A: Media Album (Media Group)
            if len(media_paths) > 1:
                files = {}
                media_group = []
                file_handles = []

                try:
                    for idx, path in enumerate(media_paths[:10]):  # Telegram allows max 10 in media group
                        attach_name = f"file{idx}"
                        fh = open(path, "rb")
                        file_handles.append(fh)
                        files[attach_name] = (Path(path).name, fh, mimetypes.guess_type(path)[0] or "application/octet-stream")

                        item: Dict[str, Any] = {
                            "type": "video" if path.lower().endswith((".mp4", ".mov")) else "photo",
                            "media": f"attach://{attach_name}",
                        }
                        if idx == 0 and content:
                            item["caption"] = escape_markdown_v2(content)[:1024]
                            item["parse_mode"] = "MarkdownV2"
                        media_group.append(item)

                    res = await client.post(
                        f"{url}/sendMediaGroup",
                        data={"chat_id": chat_id, "media": json.dumps(media_group)},
                        files=files
                    )
                    res.raise_for_status()
                    data = res.json()
                    post_id = str(data["result"][0]["message_id"]) if data.get("result") else None
                    return DispatchResult(True, platform_post_id=post_id, response_payload=data)
                finally:
                    for fh in file_handles:
                        fh.close()

            # Case B: Single Photo / Video
            elif len(media_paths) == 1:
                path = media_paths[0]
                is_video = path.lower().endswith((".mp4", ".mov"))
                method = "sendVideo" if is_video else "sendPhoto"
                field_name = "video" if is_video else "photo"

                with open(path, "rb") as fh:
                    files = {field_name: (Path(path).name, fh, mimetypes.guess_type(path)[0] or "application/octet-stream")}
                    data = {
                        "chat_id": chat_id,
                        "caption": escape_markdown_v2(content)[:1024],
                        "parse_mode": "MarkdownV2"
                    }
                    res = await client.post(f"{url}/{method}", data=data, files=files)
                    res.raise_for_status()
                    resp_data = res.json()
                    post_id = str(resp_data.get("result", {}).get("message_id"))
                    return DispatchResult(True, platform_post_id=post_id, response_payload=resp_data)

            # Case C: Text-only Message
            else:
                res = await client.post(
                    f"{url}/sendMessage",
                    json={"chat_id": chat_id, "text": escape_markdown_v2(content), "parse_mode": "MarkdownV2"}
                )
                res.raise_for_status()
                resp_data = res.json()
                post_id = str(resp_data.get("result", {}).get("message_id"))
                return DispatchResult(True, platform_post_id=post_id, response_payload=resp_data)


# ---------------------------------------------------------------------------
# 2. Discord Webhook API Dispatcher
# ---------------------------------------------------------------------------
class DiscordDispatcher(BaseSocialDispatcher):
    """Pushes rich embeds, attachments, and alerts via Discord Webhooks."""

    @retry(
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=2, max=16),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True
    )
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        webhook_url = self.credentials.get("webhook_url") or self.channel.account_identifier

        if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
            return DispatchResult(False, error_message="Invalid Discord webhook URL.")

        embed = {
            "title": "⚡ AppexQuant Quantitative Signal",
            "description": content[:4096],
            "color": 0x3B82F6,  # AppexQuant Blue
            "footer": {"text": "AppexQuant Markets Global • Algorithmic Feed"},
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            if media_paths:
                files = {}
                file_handles = []
                try:
                    for idx, path in enumerate(media_paths[:10]):
                        fh = open(path, "rb")
                        file_handles.append(fh)
                        files[f"files[{idx}]"] = (Path(path).name, fh, mimetypes.guess_type(path)[0] or "application/octet-stream")

                    payload_json = {
                        "username": "AppexQuant Radar",
                        "avatar_url": "https://raw.githubusercontent.com/AppexQuant/assets/main/logo.png",
                        "embeds": [embed]
                    }

                    res = await client.post(
                        f"{webhook_url}?wait=true",
                        data={"payload_json": json.dumps(payload_json)},
                        files=files
                    )
                    res.raise_for_status()
                    data = res.json()
                    return DispatchResult(True, platform_post_id=str(data.get("id")), response_payload=data)
                finally:
                    for fh in file_handles:
                        fh.close()
            else:
                payload = {
                    "username": "AppexQuant Radar",
                    "embeds": [embed]
                }
                res = await client.post(f"{webhook_url}?wait=true", json=payload)
                res.raise_for_status()
                data = res.json()
                return DispatchResult(True, platform_post_id=str(data.get("id")), response_payload=data)


# ---------------------------------------------------------------------------
# 3. Meta Graph API (Instagram Business & Facebook Page)
# ---------------------------------------------------------------------------
class MetaDispatcher(BaseSocialDispatcher):
    """Direct publishing to Instagram Business Accounts and Facebook Pages via Meta Graph API v20.0."""

    GRAPH_URL = "https://graph.facebook.com/v20.0"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=3, max=20),
        reraise=True
    )
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        access_token = self.credentials.get("access_token")
        account_id = self.channel.account_identifier  # IG Business ID or FB Page ID
        platform = self.channel.platform

        if not access_token or not account_id:
            return DispatchResult(False, error_message="Missing Meta Graph access_token or account_id.")

        async with httpx.AsyncClient(timeout=60.0) as client:
            # Instagram Publishing Flow (Container creation -> poll status -> publish)
            if platform == PlatformType.META_INSTAGRAM:
                if not media_paths:
                    return DispatchResult(False, error_message="Instagram requires an image or video asset.")

                media_url = self.credentials.get("public_media_base_url", "") + media_paths[0]
                is_video = media_paths[0].lower().endswith((".mp4", ".mov"))

                # 1. Create Media Container
                create_params: Dict[str, Any] = {
                    "access_token": access_token,
                    "caption": content,
                }
                if is_video:
                    create_params["media_type"] = "REELS"
                    create_params["video_url"] = media_url
                else:
                    create_params["image_url"] = media_url

                container_res = await client.post(f"{self.GRAPH_URL}/{account_id}/media", params=create_params)
                container_res.raise_for_status()
                container_id = container_res.json().get("id")

                # 2. Wait for Container Status if video
                if is_video:
                    for _ in range(12):
                        await asyncio.sleep(5)
                        status_res = await client.get(
                            f"{self.GRAPH_URL}/{container_id}",
                            params={"fields": "status_code", "access_token": access_token}
                        )
                        if status_res.status_code == 200 and status_res.json().get("status_code") == "FINISHED":
                            break

                # 3. Publish Container
                publish_res = await client.post(
                    f"{self.GRAPH_URL}/{account_id}/media_publish",
                    params={"creation_id": container_id, "access_token": access_token}
                )
                publish_res.raise_for_status()
                pub_data = publish_res.json()
                return DispatchResult(True, platform_post_id=pub_data.get("id"), response_payload=pub_data)

            # Facebook Page Flow
            else:
                if media_paths:
                    # Upload photo
                    with open(media_paths[0], "rb") as fh:
                        res = await client.post(
                            f"{self.GRAPH_URL}/{account_id}/photos",
                            params={"caption": content, "access_token": access_token},
                            files={"source": fh}
                        )
                        res.raise_for_status()
                        data = res.json()
                        return DispatchResult(True, platform_post_id=data.get("post_id") or data.get("id"), response_payload=data)
                else:
                    res = await client.post(
                        f"{self.GRAPH_URL}/{account_id}/feed",
                        params={"message": content, "access_token": access_token}
                    )
                    res.raise_for_status()
                    data = res.json()
                    return DispatchResult(True, platform_post_id=data.get("id"), response_payload=data)


# ---------------------------------------------------------------------------
# 4. TikTok Content Posting API v2 Dispatcher
# ---------------------------------------------------------------------------
class TikTokDispatcher(BaseSocialDispatcher):
    """TikTok Content Posting API (Direct Post v2) for photo carousels and vertical videos."""

    API_URL = "https://open.tiktokapis.com/v2/post/publish"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=3, max=15), reraise=True)
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        access_token = self.credentials.get("access_token")
        if not access_token:
            return DispatchResult(False, error_message="Missing TikTok access_token.")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8"
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            # Check for photo carousel vs video
            has_video = any(p.lower().endswith((".mp4", ".mov")) for p in media_paths)

            if has_video and media_paths:
                payload = {
                    "post_info": {
                        "title": content[:150],
                        "privacy_level": "PUBLIC_TO_EVERYONE",
                        "disable_duet": False,
                        "disable_comment": False,
                    },
                    "source_info": {
                        "source": "FILE_UPLOAD",
                        "video_size": os.path.getsize(media_paths[0]),
                        "chunk_size": os.path.getsize(media_paths[0]),
                        "total_chunk_count": 1
                    }
                }
                init_res = await client.post(f"{self.API_URL}/video/init/", headers=headers, json=payload)
                init_res.raise_for_status()
                data = init_res.json().get("data", {})
                publish_id = data.get("publish_id")
                upload_url = data.get("upload_url")

                if upload_url:
                    with open(media_paths[0], "rb") as fh:
                        put_headers = {
                            "Content-Range": f"bytes 0-{os.path.getsize(media_paths[0])-1}/{os.path.getsize(media_paths[0])}",
                            "Content-Type": "video/mp4"
                        }
                        await client.put(upload_url, headers=put_headers, content=fh.read())

                return DispatchResult(True, platform_post_id=publish_id, response_payload=data)

            elif media_paths:
                # Photo carousel
                images_urls = [self.credentials.get("public_media_base_url", "") + p for p in media_paths]
                payload = {
                    "post_info": {
                        "title": content[:150],
                        "description": content,
                        "privacy_level": "PUBLIC_TO_EVERYONE",
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "photo_cover_index": 1,
                        "photo_images": images_urls
                    }
                }
                res = await client.post(f"{self.API_URL}/content/init/", headers=headers, json=payload)
                res.raise_for_status()
                data = res.json().get("data", {})
                return DispatchResult(True, platform_post_id=data.get("publish_id"), response_payload=data)

            return DispatchResult(False, error_message="TikTok requires visual media assets.")


# ---------------------------------------------------------------------------
# 5. Snapchat API / Snap Kit Dispatcher
# ---------------------------------------------------------------------------
class SnapchatDispatcher(BaseSocialDispatcher):
    """Snapchat Marketing & Public Profile API for Spotlight and Story media dissemination."""

    API_URL = "https://adsapi.snapchat.com/v1"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=3, max=15), reraise=True)
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        access_token = self.credentials.get("access_token")
        profile_id = self.channel.account_identifier

        if not access_token or not profile_id:
            return DispatchResult(False, error_message="Missing Snapchat access_token or profile_id.")

        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=45.0) as client:
            if not media_paths:
                return DispatchResult(False, error_message="Snapchat requires 9:16 vertical media.")

            media_file = media_paths[0]
            with open(media_file, "rb") as fh:
                # 1. Upload Media Asset
                files = {"file": (Path(media_file).name, fh, mimetypes.guess_type(media_file)[0] or "image/png")}
                res = await client.post(
                    f"{self.API_URL}/public_profiles/{profile_id}/media",
                    headers=headers,
                    files=files
                )
                res.raise_for_status()
                media_id = res.json().get("media", {}).get("id")

                # 2. Publish to Story / Spotlight
                post_res = await client.post(
                    f"{self.API_URL}/public_profiles/{profile_id}/stories",
                    headers=headers,
                    json={
                        "media_id": media_id,
                        "caption": content[:120],
                    }
                )
                post_res.raise_for_status()
                data = post_res.json()
                return DispatchResult(True, platform_post_id=data.get("story_id"), response_payload=data)


# ---------------------------------------------------------------------------
# 6. WhatsApp Business Cloud API Dispatcher
# ---------------------------------------------------------------------------
class WhatsAppDispatcher(BaseSocialDispatcher):
    """WhatsApp Business Cloud API (v20.0) for structured templates and rich media messages."""

    GRAPH_URL = "https://graph.facebook.com/v20.0"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=12), reraise=True)
    async def publish(self, content: str, media_paths: List[str]) -> DispatchResult:
        access_token = self.credentials.get("access_token")
        phone_number_id = self.credentials.get("phone_number_id") or self.channel.account_identifier
        recipient_number = self.settings.get("recipient_number") or self.channel.account_identifier

        if not access_token or not phone_number_id:
            return DispatchResult(False, error_message="Missing WhatsApp access_token or phone_number_id.")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            # If template message is configured in channel settings
            template_name = self.settings.get("template_name")
            if template_name:
                body_payload = {
                    "messaging_product": "whatsapp",
                    "to": recipient_number,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": self.settings.get("template_lang", "en_US")},
                        "components": [
                            {
                                "type": "body",
                                "parameters": [{"type": "text", "text": content[:1024]}]
                            }
                        ]
                    }
                }
            elif media_paths:
                # Direct Image/Document message
                media_url = self.credentials.get("public_media_base_url", "") + media_paths[0]
                body_payload = {
                    "messaging_product": "whatsapp",
                    "to": recipient_number,
                    "type": "image",
                    "image": {
                        "link": media_url,
                        "caption": content[:1024]
                    }
                }
            else:
                body_payload = {
                    "messaging_product": "whatsapp",
                    "to": recipient_number,
                    "type": "text",
                    "text": {"body": content}
                }

            res = await client.post(
                f"{self.GRAPH_URL}/{phone_number_id}/messages",
                headers=headers,
                json=body_payload
            )
            res.raise_for_status()
            data = res.json()
            msg_id = data.get("messages", [{}])[0].get("id")
            return DispatchResult(True, platform_post_id=msg_id, response_payload=data)


# ---------------------------------------------------------------------------
# Dispatcher Factory
# ---------------------------------------------------------------------------
def get_dispatcher_for_platform(channel: ConnectedChannel) -> BaseSocialDispatcher:
    """Returns the dedicated dispatcher implementation for the given connected channel."""
    mapping = {
        PlatformType.TELEGRAM_BOT: TelegramDispatcher,
        PlatformType.TELEGRAM_USERBOT: TelegramDispatcher,
        PlatformType.DISCORD_WEBHOOK: DiscordDispatcher,
        PlatformType.META_INSTAGRAM: MetaDispatcher,
        PlatformType.META_FACEBOOK: MetaDispatcher,
        PlatformType.TIKTOK: TikTokDispatcher,
        PlatformType.SNAPCHAT: SnapchatDispatcher,
        PlatformType.WHATSAPP_BUSINESS: WhatsAppDispatcher,
    }

    dispatcher_cls = mapping.get(channel.platform)
    if not dispatcher_cls:
        raise ValueError(f"Unsupported social automation platform: {channel.platform}")

    return dispatcher_cls(channel)


# Class aliases matching various naming conventions
TelegramBotDispatcher = TelegramDispatcher
TelegramUserbotDispatcher = TelegramDispatcher
DiscordWebhookDispatcher = DiscordDispatcher
MetaInstagramDispatcher = MetaDispatcher
MetaFacebookDispatcher = MetaDispatcher
WhatsAppBusinessDispatcher = WhatsAppDispatcher

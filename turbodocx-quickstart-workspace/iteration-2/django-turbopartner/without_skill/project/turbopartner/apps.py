from django.apps import AppConfig
from django.conf import settings

from turbodocx_sdk import TurboPartner


class TurbopartnerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "turbopartner"

    def ready(self):
        """Configure the TurboPartner SDK when Django starts."""
        partner_api_key = getattr(settings, "TURBODOCX_PARTNER_API_KEY", "")
        partner_id = getattr(settings, "TURBODOCX_PARTNER_ID", "")
        base_url = getattr(settings, "TURBODOCX_BASE_URL", "https://api.turbodocx.com")

        if partner_api_key and partner_id:
            TurboPartner.configure(
                partner_api_key=partner_api_key,
                partner_id=partner_id,
                base_url=base_url,
            )

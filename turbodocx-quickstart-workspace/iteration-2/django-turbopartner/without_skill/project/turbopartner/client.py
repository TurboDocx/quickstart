"""
Thin helper that exposes the pre-configured TurboPartner class.

Import from here so views never have to worry about SDK imports:

    from turbopartner.client import partner
    result = await partner.list_organizations()
"""

from turbodocx_sdk import TurboPartner

partner = TurboPartner

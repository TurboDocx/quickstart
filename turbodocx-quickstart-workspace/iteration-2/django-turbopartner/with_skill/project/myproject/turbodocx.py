"""
TurboDocx SDK configuration — TurboPartner client.

Initializes the TurboPartner client using environment variables.
Import `partner` from this module wherever you need to call TurboPartner methods.
"""
import os
from turbodocx_sdk import TurboPartner

# Configure the TurboPartner client with credentials from environment variables.
# These must be set in .env or your deployment environment.
TurboPartner.configure(
    partner_api_key=os.environ["TURBODOCX_PARTNER_API_KEY"],
    partner_id=os.environ["TURBODOCX_PARTNER_ID"],
)

partner = TurboPartner

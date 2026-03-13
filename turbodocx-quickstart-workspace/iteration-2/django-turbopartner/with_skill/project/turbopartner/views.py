"""
TurboPartner API views.

Provides endpoints to provision and list customer organizations
via the TurboDocx TurboPartner SDK.
"""
import asyncio

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from myproject.turbodocx import partner
from turbodocx_sdk import (
    TurboDocxError,
    AuthenticationError,
    ValidationError,
)


@api_view(["POST"])
def create_organization(request):
    """
    Provision a new customer organization.

    Expects JSON body:
    {
        "name": "Acme Corp",
        "features": {"maxUsers": 50, "hasTDAI": true}  // optional
    }
    """
    name = request.data.get("name")
    if not name:
        return Response(
            {"error": "The 'name' field is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    features = request.data.get("features", {})

    try:
        # TurboPartner methods are async — use asyncio.run() in sync Django views
        result = asyncio.run(
            partner.create_organization(name=name, features=features)
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except AuthenticationError:
        return Response(
            {"error": "Invalid or missing TurboPartner API key."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except ValidationError as e:
        return Response(
            {"error": f"Validation failed: {e.message}"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except TurboDocxError as e:
        return Response(
            {"error": f"TurboDocx error {e.code}: {e.message}"},
            status=e.status or status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def list_organizations(request):
    """
    List all managed customer organizations.

    Query parameters:
    - page (int, default 1)
    - limit (int, default 20)
    """
    page = int(request.query_params.get("page", 1))
    limit = int(request.query_params.get("limit", 20))

    try:
        # TurboPartner methods are async — use asyncio.run() in sync Django views
        result = asyncio.run(
            partner.list_organizations(page=page, limit=limit)
        )
        return Response(result)
    except AuthenticationError:
        return Response(
            {"error": "Invalid or missing TurboPartner API key."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except TurboDocxError as e:
        return Response(
            {"error": f"TurboDocx error {e.code}: {e.message}"},
            status=e.status or status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

"""
Django REST Framework views for TurboDocx TurboPartner integration.

Each view wraps the corresponding TurboPartner SDK method, exposing it as a
standard REST endpoint.  The SDK methods are async, so we use
asgiref.sync.async_to_sync to call them from synchronous DRF views.
"""

from asgiref.sync import async_to_sync
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from turbodocx_sdk import (
    TurboDocxError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    RateLimitError,
)

from .client import partner


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _error_response(exc: TurboDocxError) -> Response:
    """Map a TurboDocx SDK exception to an appropriate DRF Response."""
    status_map = {
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        ValidationError: status.HTTP_400_BAD_REQUEST,
        NotFoundError: status.HTTP_404_NOT_FOUND,
        RateLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
    }
    http_status = status_map.get(type(exc), status.HTTP_502_BAD_GATEWAY)
    return Response(
        {"success": False, "error": str(exc)},
        status=http_status,
    )


def _int_or_none(value):
    """Safely cast a query-param value to int, or return None."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Organization endpoints
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def organizations(request: Request) -> Response:
    """
    GET  — List organisations (optional query params: limit, offset, search)
    POST — Create a new organisation (body: name, metadata?, features?)
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.list_organizations)(
                limit=_int_or_none(request.query_params.get("limit")),
                offset=_int_or_none(request.query_params.get("offset")),
                search=request.query_params.get("search"),
            )
            return Response(result)

        # POST
        name = request.data.get("name")
        if not name:
            return Response(
                {"success": False, "error": "name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = async_to_sync(partner.create_organization)(
            name=name,
            metadata=request.data.get("metadata"),
            features=request.data.get("features"),
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["GET", "PATCH", "DELETE"])
def organization_detail(request: Request, org_id: str) -> Response:
    """
    GET    — Get organisation details
    PATCH  — Update organisation info (body: name)
    DELETE — Delete organisation
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.get_organization_details)(org_id)
            return Response(result)

        if request.method == "PATCH":
            name = request.data.get("name")
            if not name:
                return Response(
                    {"success": False, "error": "name is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = async_to_sync(partner.update_organization_info)(org_id, name=name)
            return Response(result)

        # DELETE
        result = async_to_sync(partner.delete_organization)(org_id)
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["PATCH"])
def organization_entitlements(request: Request, org_id: str) -> Response:
    """
    PATCH — Update organisation entitlements (body: features?, tracking?)
    """
    try:
        result = async_to_sync(partner.update_organization_entitlements)(
            org_id,
            features=request.data.get("features"),
            tracking=request.data.get("tracking"),
        )
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


# ---------------------------------------------------------------------------
# Organisation User endpoints
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def organization_users(request: Request, org_id: str) -> Response:
    """
    GET  — List users in an organisation
    POST — Add a user (body: email, role)
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.list_organization_users)(
                org_id,
                limit=_int_or_none(request.query_params.get("limit")),
                offset=_int_or_none(request.query_params.get("offset")),
                search=request.query_params.get("search"),
            )
            return Response(result)

        # POST
        email = request.data.get("email")
        role = request.data.get("role")
        if not email or not role:
            return Response(
                {"success": False, "error": "email and role are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = async_to_sync(partner.add_user_to_organization)(
            org_id, email=email, role=role
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["PATCH", "DELETE"])
def organization_user_detail(request: Request, org_id: str, user_id: str) -> Response:
    """
    PATCH  — Update user role (body: role)
    DELETE — Remove user from organisation
    """
    try:
        if request.method == "PATCH":
            role = request.data.get("role")
            if not role:
                return Response(
                    {"success": False, "error": "role is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = async_to_sync(partner.update_organization_user_role)(
                org_id, user_id, role=role
            )
            return Response(result)

        # DELETE
        result = async_to_sync(partner.remove_user_from_organization)(org_id, user_id)
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["POST"])
def organization_user_resend_invite(
    request: Request, org_id: str, user_id: str
) -> Response:
    """POST — Resend invitation email to a user."""
    try:
        result = async_to_sync(partner.resend_organization_invitation_to_user)(
            org_id, user_id
        )
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


# ---------------------------------------------------------------------------
# Organisation API-Key endpoints
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def organization_api_keys(request: Request, org_id: str) -> Response:
    """
    GET  — List API keys for an organisation
    POST — Create an API key (body: name, role)
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.list_organization_api_keys)(
                org_id,
                limit=_int_or_none(request.query_params.get("limit")),
                offset=_int_or_none(request.query_params.get("offset")),
                search=request.query_params.get("search"),
            )
            return Response(result)

        # POST
        name = request.data.get("name")
        role = request.data.get("role")
        if not name or not role:
            return Response(
                {"success": False, "error": "name and role are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = async_to_sync(partner.create_organization_api_key)(
            org_id, name=name, role=role
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["PATCH", "DELETE"])
def organization_api_key_detail(
    request: Request, org_id: str, key_id: str
) -> Response:
    """
    PATCH  — Update an API key (body: name?, role?)
    DELETE — Revoke an API key
    """
    try:
        if request.method == "PATCH":
            result = async_to_sync(partner.update_organization_api_key)(
                org_id,
                key_id,
                name=request.data.get("name"),
                role=request.data.get("role"),
            )
            return Response(result)

        # DELETE
        result = async_to_sync(partner.revoke_organization_api_key)(org_id, key_id)
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


# ---------------------------------------------------------------------------
# Partner API-Key endpoints
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def partner_api_keys(request: Request) -> Response:
    """
    GET  — List partner-level API keys
    POST — Create a partner API key (body: name, scopes, description?)
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.list_partner_api_keys)(
                limit=_int_or_none(request.query_params.get("limit")),
                offset=_int_or_none(request.query_params.get("offset")),
                search=request.query_params.get("search"),
            )
            return Response(result)

        # POST
        name = request.data.get("name")
        scopes = request.data.get("scopes")
        if not name or not scopes:
            return Response(
                {"success": False, "error": "name and scopes are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = async_to_sync(partner.create_partner_api_key)(
            name=name,
            scopes=scopes,
            description=request.data.get("description"),
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["PATCH", "DELETE"])
def partner_api_key_detail(request: Request, key_id: str) -> Response:
    """
    PATCH  — Update a partner API key (body: name?, description?, scopes?)
    DELETE — Revoke a partner API key
    """
    try:
        if request.method == "PATCH":
            result = async_to_sync(partner.update_partner_api_key)(
                key_id,
                name=request.data.get("name"),
                description=request.data.get("description"),
                scopes=request.data.get("scopes"),
            )
            return Response(result)

        # DELETE
        result = async_to_sync(partner.revoke_partner_api_key)(key_id)
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


# ---------------------------------------------------------------------------
# Partner Portal User endpoints
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
def partner_users(request: Request) -> Response:
    """
    GET  — List partner portal users
    POST — Add a user to partner portal (body: email, role, permissions)
    """
    try:
        if request.method == "GET":
            result = async_to_sync(partner.list_partner_portal_users)(
                limit=_int_or_none(request.query_params.get("limit")),
                offset=_int_or_none(request.query_params.get("offset")),
                search=request.query_params.get("search"),
            )
            return Response(result)

        # POST
        email = request.data.get("email")
        role = request.data.get("role")
        permissions = request.data.get("permissions")
        if not email or not role or permissions is None:
            return Response(
                {"success": False, "error": "email, role, and permissions are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = async_to_sync(partner.add_user_to_partner_portal)(
            email=email, role=role, permissions=permissions
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["PATCH", "DELETE"])
def partner_user_detail(request: Request, user_id: str) -> Response:
    """
    PATCH  — Update partner user role/permissions (body: role?, permissions?)
    DELETE — Remove user from partner portal
    """
    try:
        if request.method == "PATCH":
            result = async_to_sync(partner.update_partner_user_permissions)(
                user_id,
                role=request.data.get("role"),
                permissions=request.data.get("permissions"),
            )
            return Response(result)

        # DELETE
        result = async_to_sync(partner.remove_user_from_partner_portal)(user_id)
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


@api_view(["POST"])
def partner_user_resend_invite(request: Request, user_id: str) -> Response:
    """POST — Resend partner portal invitation email."""
    try:
        result = async_to_sync(partner.resend_partner_portal_invitation_to_user)(
            user_id
        )
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)


# ---------------------------------------------------------------------------
# Audit Log endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
def audit_logs(request: Request) -> Response:
    """
    GET — Retrieve partner audit logs with optional filtering.

    Query params: limit, offset, search, action, resource_type, resource_id,
                  success, start_date, end_date
    """
    try:
        success_param = request.query_params.get("success")
        success_val = None
        if success_param is not None:
            success_val = success_param.lower() in ("true", "1", "yes")

        result = async_to_sync(partner.get_partner_audit_logs)(
            limit=_int_or_none(request.query_params.get("limit")),
            offset=_int_or_none(request.query_params.get("offset")),
            search=request.query_params.get("search"),
            action=request.query_params.get("action"),
            resource_type=request.query_params.get("resource_type"),
            resource_id=request.query_params.get("resource_id"),
            success=success_val,
            start_date=request.query_params.get("start_date"),
            end_date=request.query_params.get("end_date"),
        )
        return Response(result)
    except TurboDocxError as exc:
        return _error_response(exc)

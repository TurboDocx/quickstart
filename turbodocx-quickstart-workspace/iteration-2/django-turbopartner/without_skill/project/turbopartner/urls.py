from django.urls import path

from . import views

app_name = "turbopartner"

urlpatterns = [
    # --- Organizations ---
    path(
        "organizations/",
        views.organizations,
        name="organizations",
    ),
    path(
        "organizations/<str:org_id>/",
        views.organization_detail,
        name="organization-detail",
    ),
    path(
        "organizations/<str:org_id>/entitlements/",
        views.organization_entitlements,
        name="organization-entitlements",
    ),

    # --- Organization Users ---
    path(
        "organizations/<str:org_id>/users/",
        views.organization_users,
        name="organization-users",
    ),
    path(
        "organizations/<str:org_id>/users/<str:user_id>/",
        views.organization_user_detail,
        name="organization-user-detail",
    ),
    path(
        "organizations/<str:org_id>/users/<str:user_id>/resend-invitation/",
        views.organization_user_resend_invite,
        name="organization-user-resend-invite",
    ),

    # --- Organization API Keys ---
    path(
        "organizations/<str:org_id>/apikeys/",
        views.organization_api_keys,
        name="organization-api-keys",
    ),
    path(
        "organizations/<str:org_id>/apikeys/<str:key_id>/",
        views.organization_api_key_detail,
        name="organization-api-key-detail",
    ),

    # --- Partner API Keys ---
    path(
        "partner-apikeys/",
        views.partner_api_keys,
        name="partner-api-keys",
    ),
    path(
        "partner-apikeys/<str:key_id>/",
        views.partner_api_key_detail,
        name="partner-api-key-detail",
    ),

    # --- Partner Portal Users ---
    path(
        "partner-users/",
        views.partner_users,
        name="partner-users",
    ),
    path(
        "partner-users/<str:user_id>/",
        views.partner_user_detail,
        name="partner-user-detail",
    ),
    path(
        "partner-users/<str:user_id>/resend-invitation/",
        views.partner_user_resend_invite,
        name="partner-user-resend-invite",
    ),

    # --- Audit Logs ---
    path(
        "audit-logs/",
        views.audit_logs,
        name="audit-logs",
    ),
]

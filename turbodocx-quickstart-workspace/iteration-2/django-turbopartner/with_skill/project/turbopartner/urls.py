from django.urls import path
from . import views

urlpatterns = [
    path("create/", views.create_organization, name="create-organization"),
    path("", views.list_organizations, name="list-organizations"),
]

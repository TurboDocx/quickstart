from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse


def health(request):
    return JsonResponse({"ok": True})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health),
    path('api/turbopartner/', include('turbopartner.urls')),
]

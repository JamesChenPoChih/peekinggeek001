from django.db import connection
from django.http import JsonResponse


def service_status(request):
    return JsonResponse({
        "service": "PickingGeek API",
        "status": "ok",
        "api": "/api/",
        "health": "/health/",
    })


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return JsonResponse({"status": "unhealthy", "database": "unavailable"}, status=503)

    return JsonResponse({"status": "healthy", "database": "connected"})

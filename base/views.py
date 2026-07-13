import time

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.utils.timezone import now


def health(request):
    checks = {}

    start = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        checks['database'] = {'status': 'connected', 'latency_ms': round((time.monotonic() - start) * 1000, 1)}
    except Exception:
        checks['database'] = {'status': 'disconnected'}

    start = time.monotonic()
    try:
        cache.set('health_ping', '1', timeout=5)
        checks['cache'] = {'status': 'connected', 'latency_ms': round((time.monotonic() - start) * 1000, 1)}
    except Exception:
        checks['cache'] = {'status': 'disconnected'}

    healthy = all(check['status'] == 'connected' for check in checks.values())
    return JsonResponse(
        {'status': 'healthy' if healthy else 'unhealthy', **checks, 'timestamp': now().isoformat()},
        status=200 if healthy else 503,
    )

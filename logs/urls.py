from django.urls import path
from .views import LogViewSet

urlpatterns = [
    path('', LogViewSet.as_view({
        'get': 'list',
    }), name='logs'),
    path('<uuid:activity_id>/', LogViewSet.as_view({
        'get': 'retrieve',
    }), name='log'),
]

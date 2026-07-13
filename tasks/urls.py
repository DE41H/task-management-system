from django.urls import path
from .views import TaskViewSet, CommentViewSet

urlpatterns = [
    path('', TaskViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='tasks'),
    path('<uuid:task_id>/', TaskViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='task'),
    path('<uuid:task_id>/comments/', CommentViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='comments'),
    path('<uuid:task_id>/comments/<uuid:comment_id>/', CommentViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='comment'),
]

from django.urls import include, path
from .views import ProjectViewSet

urlpatterns = [
    path('', ProjectViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='projects'),
    path('<uuid:project_id>/', ProjectViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='project'),
    path('<uuid:project_id>/tasks/', include('tasks.urls'))
]

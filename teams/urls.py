from django.urls import include, path

from .views import InviteViewSet, MembershipViewSet, TeamViewSet

urlpatterns = [
    path('', TeamViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='teams'),
    path('<uuid:team_id>/', TeamViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='team'),
    path('<uuid:team_id>/projects/', include('projects.urls')),
    path('<uuid:team_id>/logs/', include('logs.urls')),
    path('<uuid:team_id>/members/', MembershipViewSet.as_view({
        'get': 'list',
    }), name='members'),
    path('<uuid:team_id>/members/<uuid:membership_id>/', MembershipViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }), name='member'),
    path('<uuid:team_id>/invites/', InviteViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }), name='invites'),
    path('<uuid:team_id>/invites/<uuid:invite_id>/', InviteViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
    }), name='invite'),
]

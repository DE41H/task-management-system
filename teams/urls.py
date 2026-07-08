from django.urls import path
from .views import (
    TeamsView, TeamView, TeamUpdateView, TeamDeleteView, TeamLeaveView,
    InviteListView, InviteAcceptView, InviteCancelView, InviteRejectView,
    MembershipListView, MembershipUpdateView, MembershipDeleteView, MembershipView,
)

urlpatterns = [
    path('', TeamsView.as_view(), name='teams'),
    path('<uuid:team_id>/', TeamView.as_view(), name='team'),
    path('<uuid:team_id>/update/', TeamUpdateView.as_view(), name='team_update'),
    path('<uuid:team_id>/delete/', TeamDeleteView.as_view(), name='team_delete'),
    path('<uuid:team_id>/leave/', TeamLeaveView.as_view(), name='team_leave'),
    path('<uuid:team_id>/invites/', InviteListView.as_view(), name='team_invites'),
    path('<uuid:team_id>/members/', MembershipListView.as_view(), name='team_memberships'),
    path('<uuid:team_id>/members/<uuid:membership_id>/', MembershipView.as_view(), name='membership'),
    path('<uuid:team_id>/members/<uuid:membership_id>/update/', MembershipUpdateView.as_view(), name='membership_update'),
    path('<uuid:team_id>/members/<uuid:membership_id>/remove/', MembershipDeleteView.as_view(), name='membership_delete'),
    path('invites/<uuid:invite_id>/accept/', InviteAcceptView.as_view(), name='invite_accept'),
    path('invites/<uuid:invite_id>/cancel/', InviteCancelView.as_view(), name='invite_cancel'),
    path('invites/<uuid:invite_id>/reject/', InviteRejectView.as_view(), name='invite_reject'),
]

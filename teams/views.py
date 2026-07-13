from django.db import IntegrityError
from django.db.transaction import atomic
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from logs.models import Log

from .models import Invitation, InvitationStatus, Membership, Role, Team
from .permissions import HasPermission, IsInviteReceiver, IsSelfMembership, Scope
from .serializers import InvitationSerializer, MembershipSerializer, TeamSerializer

# Create your views here.

class TeamViewSet(ModelViewSet):
    serializer_class = TeamSerializer
    lookup_url_kwarg = 'team_id'
    filter_backends = [SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        return self.request.user.teams.prefetch_related('members').order_by('-id').all()  # pyright: ignore[reportAttributeAccessIssue]

    def get_permissions(self):
        if self.action in {'update', 'partial_update'}:
            return [IsAuthenticated(), HasPermission(Scope.TEAM_UPDATE)()]
        if self.action == 'destroy':
            return [IsAuthenticated(), HasPermission(Scope.TEAM_DELETE)()]
        if self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission(Scope.TEAM_VIEW)()]
        return [IsAuthenticated()]

    @atomic()
    def perform_create(self, serializer):
        team = serializer.save()
        Membership.objects.create(user_id=self.request.user.pk, team_id=team.id, role=Role.OWNER)
        Log.record(team.id, self.request.user, f"{self.request.user.username} created the team")  # pyright: ignore[reportAttributeAccessIssue]

class MembershipViewSet(ModelViewSet):
    serializer_class = MembershipSerializer
    lookup_url_kwarg = 'membership_id'

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        return Membership.objects.select_related('user').filter(team_id=team_id).order_by('-id')

    def get_permissions(self):
        if self.action == 'partial_update':
            return [IsAuthenticated(), HasPermission(Scope.TEAM_CHANGE_ROLES)()]
        if self.action == 'destroy':
            return [IsAuthenticated(), (HasPermission(Scope.TEAM_REMOVE) | IsSelfMembership)()]
        if self.action in {'retrieve', 'list'}:
            return [IsAuthenticated(), HasPermission(Scope.TEAM_VIEW)()]
        return [IsAuthenticated()]

    @atomic()
    def perform_update(self, serializer):
        membership = serializer.save()
        Log.record(membership.team_id, self.request.user, f"{self.request.user.username} changed {membership.user.username}'s role to {membership.role}")  # pyright: ignore[reportAttributeAccessIssue]

    @atomic()
    def perform_destroy(self, instance):
        Team.objects.select_for_update().get(id=instance.team_id)
        if self.action == 'destroy' and not Membership.objects.filter(team_id=instance.team_id, role=Role.OWNER).exclude(id=instance.id).exists():  # pyright: ignore[reportAttributeAccessIssue]
            raise ValidationError({'detail': 'There must be atleast one remaining owner.'})
        if instance.user_id == self.request.user.pk:
            content = f"{instance.user.username} left the team"
        else:
            content = f"{self.request.user.username} removed {instance.user.username} from the team"  # pyright: ignore[reportAttributeAccessIssue]
        team_id = instance.team_id
        instance.delete()
        Log.record(team_id, self.request.user, content)

class InviteViewSet(ModelViewSet):
    serializer_class = InvitationSerializer
    lookup_url_kwarg = 'invite_id'

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        return Invitation.objects.filter(team_id=team_id).order_by('-id')

    def get_permissions(self):
        if self.action in {'retrieve', 'partial_update'}:
            return [IsAuthenticated(), (HasPermission(Scope.TEAM_INVITE) | IsInviteReceiver)()]
        if self.action in {'list', 'create'}:
            return [IsAuthenticated(), HasPermission(Scope.TEAM_INVITE)()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # TODO: Background email sending
        team_id = self.kwargs['team_id']
        serializer.save(team_id=team_id, sender_id=self.request.user.pk)

    def perform_update(self, serializer):
        team_id = self.kwargs['team_id']
        try:
            with atomic():
                invite = serializer.save()
                if invite.status == InvitationStatus.ACCEPTED:
                    Membership.objects.create(team_id=team_id, user_id=self.request.user.pk, role=invite.role)
                    Log.record(team_id, self.request.user, f"{self.request.user.username} joined the team")  # pyright: ignore[reportAttributeAccessIssue]
        except IntegrityError:
            raise ValidationError({'receiver': 'User is already a member of the Team.'})

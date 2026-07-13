from rest_framework.permissions import BasePermission
from .models import Membership, Role

class Scope:
    TEAM_VIEW = 'team:view'
    TEAM_UPDATE = 'team:update'
    TEAM_INVITE = 'team:invite'
    TEAM_REMOVE = 'team:remove'
    TEAM_CHANGE_ROLES = 'team:change_roles'
    TEAM_DELETE = 'team:delete'
    PROJECT_CREATE = 'project:create'
    PROJECT_EDIT = 'project:edit'
    PROJECT_DELETE = 'project:delete'
    TASK_CREATE = 'task:create'
    TASK_ASSIGN = 'task:assign'
    TASK_UPDATE = 'task:update'
    TASK_DELETE = 'task:delete'
    TASK_VIEW = 'task:view'
    COMMENT = 'task:comment'

SCOPES: dict[str, set] = {}
SCOPES[Role.VIEWER] = {Scope.TEAM_VIEW, Scope.TASK_VIEW, Scope.COMMENT}
SCOPES[Role.MEMBER] = {*SCOPES[Role.VIEWER], Scope.TASK_CREATE}
SCOPES[Role.MAINTAINER] = {*SCOPES[Role.MEMBER], Scope.TEAM_INVITE, Scope.PROJECT_CREATE, Scope.PROJECT_EDIT, Scope.PROJECT_DELETE, Scope.TASK_ASSIGN, Scope.TASK_UPDATE, Scope.TASK_DELETE}
SCOPES[Role.OWNER] = {*SCOPES[Role.MAINTAINER], Scope.TEAM_CHANGE_ROLES, Scope.TEAM_UPDATE, Scope.TEAM_DELETE, Scope.TEAM_REMOVE}

def HasPermission(*scopes):
    def get_membership(request, team_id):
        if not hasattr(request, '_membership'):
            setattr(request, '_membership', Membership.objects.filter(user=request.user, team_id=team_id).only('role').first())
        return getattr(request, '_membership')

    class _HasPermission(BasePermission):
        def has_permission(self, request, view):  # pyright: ignore[reportIncompatibleMethodOverride]
            team_id = view.kwargs.get('team_id')
            if not team_id:
                return False
            membership = get_membership(request, team_id)
            if membership is None:
                return False
            return SCOPES[membership.role].issuperset(scopes)
    return _HasPermission

class IsSelfMembership(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.pk

class IsInviteReceiver(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.receiver_id == request.user.pk

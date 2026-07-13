from rest_framework.permissions import BasePermission

from tasks.models import Task


class IsTaskAssignee(BasePermission):
    def has_object_permission(self, request, view, obj: Task):
        team_id = view.kwargs['team_id']
        return obj.assignees.filter(id=request.user.pk, memberships__team_id=team_id).exists()

class IsCommentAuthor(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.author_id == request.user.pk

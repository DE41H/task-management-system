from rest_framework.permissions import BasePermission

class IsTaskAssignee(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.assignees.filter(pk=request.user.pk).exists()

class IsCommentAuthor(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.author_id == request.user.pk

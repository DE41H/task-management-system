from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .serializers import CommentSerializer, TaskSerializer
from .models import Comment, Task
from .permissions import IsTaskAssignee, IsCommentAuthor
from teams.permissions import HasPermission, Scope

# Create your views here.

class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    lookup_url_kwarg = 'task_id'

    def get_queryset(self):
        project_id = self.kwargs['project_id']
        team_id = self.kwargs['team_id']
        return Task.objects.select_related('project').prefetch_related('assignees').filter(project_id=project_id, project__team_id=team_id)

    def get_permissions(self):
        if self.action in {'update', 'partial_update'}:
            permissions = [IsAuthenticated(), (HasPermission(Scope.TASK_UPDATE) | IsTaskAssignee)()]
            if 'assignees' in self.request.data:
                permissions.append(HasPermission(Scope.TASK_ASSIGN)())
            return permissions
        if self.action == 'create':
            scopes = [Scope.TASK_CREATE]
            if 'assignees' in self.request.data:
                scopes.append(Scope.TASK_ASSIGN)
            return [IsAuthenticated(), HasPermission(*scopes)()]
        if self.action == 'destroy':
            return [IsAuthenticated(), HasPermission(Scope.TASK_DELETE)()]
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated(), HasPermission(Scope.TASK_VIEW)()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        project_id = self.kwargs['project_id']
        try:
            serializer.save(project_id=project_id, creator_id=self.request.user.pk)
        except IntegrityError:
            raise ValidationError({'title': 'A Task with this title already exists in this Project.'})

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError({'title': 'A Task with this title already exists in this Project.'})

class CommentViewSet(ModelViewSet):
    serializer_class = CommentSerializer
    lookup_url_kwarg = 'comment_id'

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        project_id = self.kwargs['project_id']
        task_id = self.kwargs['task_id']
        return Comment.objects.select_related('task', 'task__project').filter(task_id=task_id, task__project_id=project_id, task__project__team_id=team_id)

    def get_permissions(self):
        if self.action in {'update', 'partial_update', 'destroy'}:
            return [IsAuthenticated(), HasPermission(Scope.COMMENT)(), IsCommentAuthor()]
        if self.action in {'create', 'list', 'retrieve'}:
            return [IsAuthenticated(), HasPermission(Scope.COMMENT)()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        serializer.save(task_id=task_id, author_id=self.request.user.pk)

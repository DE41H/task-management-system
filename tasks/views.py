from django.db import IntegrityError
from django.db.transaction import atomic, on_commit
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from logs.models import Log
from projects.models import Project
from teams.permissions import HasPermission, Scope

from .models import Comment, Task
from .permissions import IsCommentAuthor, IsTaskAssignee
from .serializers import CommentSerializer, TaskSerializer
from .tasks import notify_task_assigned, notify_task_status_changed

# Create your views here.

class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    lookup_url_kwarg = 'task_id'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority']
    search_fields = ['title']
    ordering_fields = ['created_at', 'due']

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        project_id = self.kwargs['project_id']
        return Task.objects.prefetch_related('assignees').filter(project_id=project_id, project__team_id=team_id).order_by('-id')

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

    @atomic()
    def perform_create(self, serializer):
        team_id = self.kwargs['team_id']
        project_id = self.kwargs['project_id']
        if not Project.objects.filter(id=project_id, team_id=team_id).exists():
            raise NotFound()
        try:
            task = serializer.save(project_id=project_id, creator_id=self.request.user.pk)
        except IntegrityError:
            raise ValidationError({'title': 'A Task with this title already exists in this Project.'})
        assignee_ids = [str(id) for id in task.assignees.values_list('id', flat=True)]
        if assignee_ids:
            on_commit(lambda: notify_task_assigned.delay(str(task.id), assignee_ids))  # pyright: ignore[reportCallIssue]
        Log.record(team_id, self.request.user, f"{self.request.user.username} created task '{task.title}'")  # pyright: ignore[reportAttributeAccessIssue]

    @atomic()
    def perform_update(self, serializer):
        old_status = serializer.instance.status  # pyright: ignore[reportOptionalMemberAccess]
        old_assignee_ids = set(serializer.instance.assignees.values_list('id', flat=True)) if 'assignees' in serializer.validated_data else None  # pyright: ignore[reportOptionalMemberAccess]
        added_ids = [str(user.id) for user in serializer.validated_data.get('assignees', []) if user.id not in old_assignee_ids]
        try:
            task = serializer.save()
        except IntegrityError:
            raise ValidationError({'title': 'A Task with this title already exists in this Project.'})
        if old_assignee_ids is not None and added_ids:
            on_commit(lambda: notify_task_assigned.delay(str(task.id), added_ids))  # pyright: ignore[reportCallIssue]
        if task.status != old_status:
            on_commit(lambda: notify_task_status_changed.delay(str(task.id), old_status))  # pyright: ignore[reportCallIssue]
        Log.record(self.kwargs['team_id'], self.request.user, f"{self.request.user.username} updated task '{task.title}'")  # pyright: ignore[reportAttributeAccessIssue]

    @atomic()
    def perform_destroy(self, instance):
        team_id, title = self.kwargs['team_id'], instance.title
        instance.delete()
        Log.record(team_id, self.request.user, f"{self.request.user.username} deleted task '{title}'")  # pyright: ignore[reportAttributeAccessIssue]

class CommentViewSet(ModelViewSet):
    serializer_class = CommentSerializer
    lookup_url_kwarg = 'comment_id'

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        project_id = self.kwargs['project_id']
        task_id = self.kwargs['task_id']
        return Comment.objects.filter(task_id=task_id, task__project_id=project_id, task__project__team_id=team_id).order_by('-id')

    def get_permissions(self):
        if self.action in {'partial_update', 'destroy'}:
            return [IsAuthenticated(), HasPermission(Scope.COMMENT)(), IsCommentAuthor()]
        if self.action in {'create', 'list', 'retrieve'}:
            return [IsAuthenticated(), HasPermission(Scope.COMMENT)()]
        return [IsAuthenticated()]

    @atomic()
    def perform_create(self, serializer):
        task_id = self.kwargs['task_id']
        project_id = self.kwargs['project_id']
        team_id = self.kwargs['team_id']
        task = Task.objects.filter(id=task_id, project_id=project_id, project__team_id=team_id).first()
        if task is None:
            raise NotFound()
        serializer.save(task_id=task_id, author_id=self.request.user.pk)
        Log.record(team_id, self.request.user, f"{self.request.user.username} commented on task '{task.title}'")  # pyright: ignore[reportAttributeAccessIssue]

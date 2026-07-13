from django.db import IntegrityError
from django.db.transaction import atomic
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter
from logs.models import Log
from .models import Project
from .serializers import ProjectSerializer
from teams.permissions import HasPermission, Scope

# Create your views here.

class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    lookup_url_kwarg = 'project_id'
    filter_backends = [SearchFilter]
    search_fields = ['title']

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        return Project.objects.filter(team_id=team_id).order_by('-id')

    def get_permissions(self):
        if self.action in {'update', 'partial_update'}:
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_EDIT)()]
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_CREATE)()]
        if self.action == 'destroy':
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_DELETE)()]
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated(), HasPermission(Scope.TEAM_VIEW)()]
        return [IsAuthenticated()]

    @atomic()
    def perform_create(self, serializer):
        team_id = self.kwargs['team_id']
        try:
            project = serializer.save(team_id=team_id, creator_id=self.request.user.pk)
        except IntegrityError:
            raise ValidationError({'title': 'A project with this title already exists in this team.'})
        Log.record(team_id, self.request.user, f"{self.request.user.username} created project '{project.title}'")  # pyright: ignore[reportAttributeAccessIssue]

    @atomic()
    def perform_update(self, serializer):
        try:
            project = serializer.save()
        except IntegrityError:
            raise ValidationError({'title': 'A project with this title already exists in this team.'})
        Log.record(project.team_id, self.request.user, f"{self.request.user.username} updated project '{project.title}'")  # pyright: ignore[reportAttributeAccessIssue]

    @atomic()
    def perform_destroy(self, instance):
        team_id, title = instance.team_id, instance.title
        instance.delete()
        Log.record(team_id, self.request.user, f"{self.request.user.username} deleted project '{title}'")  # pyright: ignore[reportAttributeAccessIssue]

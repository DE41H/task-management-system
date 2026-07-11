from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Project
from .serializers import ProjectSerializer
from teams.permissions import HasPermission, Scope

# Create your views here.

class ProjectViewSet(ModelViewSet):
    serializer_class = ProjectSerializer
    lookup_url_kwarg = 'project_id'

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        return Project.objects.filter(team_id=team_id)

    def get_permissions(self):
        if self.action in {'update', 'partial_update'}:
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_EDIT)()]
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_CREATE)()]
        if self.action == 'destroy':
            return [IsAuthenticated(), HasPermission(Scope.PROJECT_DELETE)()]
        if self.action in {'list', 'retrieve'}:
            return [IsAuthenticated(), HasPermission(Scope.TASK_VIEW)()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        team_id = self.kwargs['team_id']
        try:
            serializer.save(team_id=team_id, creator_id=self.request.user.pk)
        except IntegrityError:
            raise ValidationError({'title': 'A project with this title already exists in this team.'})

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError({'title': 'A project with this title already exists in this team.'})

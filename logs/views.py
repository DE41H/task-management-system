from rest_framework.viewsets import ReadOnlyModelViewSet
from .serializers import LogSerializer
from .models import Log
from rest_framework.permissions import IsAuthenticated
from teams.permissions import HasPermission, Scope

# Create your views here.

class LogViewSet(ReadOnlyModelViewSet):
    serializer_class = LogSerializer
    permission_classes = [IsAuthenticated, HasPermission(Scope.TEAM_VIEW)]

    def get_queryset(self):
        team_id = self.kwargs['team_id']
        return Log.objects.select_related('user').filter(team_id=team_id).order_by('-id')

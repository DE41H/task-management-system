from django.db import models

from base.models import BaseModel

# Create your models here.

class Log(BaseModel):
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='logs')
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True)
    content = models.TextField()

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        indexes = [
            models.Index(fields=['team', '-id'])
        ]

    @classmethod
    def record(cls, team_id, user, content):
        return cls.objects.create(team_id=team_id, user=user, content=content)

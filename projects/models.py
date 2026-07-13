from django.db import models

from base.models import BaseModel

# Create your models here.

class Project(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='projects')
    creator = models.ForeignKey(to='users.CustomUser', on_delete=models.SET_NULL, null=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        constraints = [
            models.UniqueConstraint(fields=['team', 'title'], name='unique_project_title_per_team')
        ]

    def __str__(self) -> str:
        return str(self.id)

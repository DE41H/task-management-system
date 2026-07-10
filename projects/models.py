from django.db import models
from base.models import BaseModel

# Create your models here.

class ProjectStatus(models.TextChoices):
    ACTIVE = 'active'
    ON_HOLD = 'on_hold'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

class Project(BaseModel):
    title = models.CharField(max_length=128)
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='projects')
    description = models.CharField(max_length=600, null=True, blank=True)
    created_by = models.ForeignKey(to='users.CustomUser', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=10, choices=ProjectStatus.choices, default=ProjectStatus.ACTIVE)

    class Meta(BaseModel.Meta):
        abstract = False
        constraints = [
            models.UniqueConstraint(fields=['team', 'title'], name='unique_team_title_per_project')
        ]

    def __str__(self) -> str:
        return str(self.id)

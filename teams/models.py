from django.db import models
from base.models import BaseModel

# Create your models here.

class Team(BaseModel, models.Model):
    name = models.CharField(max_length=128)
    members = models.ManyToManyField(to='users.CustomUser', through='teams.Membership', related_name='teams')

    class Meta(BaseModel.Meta):
        abstract = False

    def __str__(self):
        return str(self.id)

class Role(models.TextChoices):
    OWNER = 'owner'
    MAINTAINER = 'maintainer'
    MEMBER = 'member'
    VIEWER = 'viewer'

class Membership(BaseModel, models.Model):
    user = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='memberships')
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=15, choices=Role.choices)

    class Meta(BaseModel.Meta):
        abstract = False
        constraints = [
            models.UniqueConstraint(fields=['user', 'team'], name='unique_user_team_membership')
        ]

    def __str__(self):
        return str(self.id)

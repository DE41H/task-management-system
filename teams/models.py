from django.db import models
from uuid6 import uuid7

# Create your models here.

class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    name = models.CharField(max_length=128)
    members = models.ManyToManyField(to='users.CustomUser', through='teams.Membership', related_name='teams')

    def __str__(self):
        return str(self.id)

class Role(models.TextChoices):
    OWNER = 'owner'
    MAINTAINER = 'maintainer'
    MEMBER = 'member'
    VIEWER = 'viewer'

class Membership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    user = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='memberships')
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=15, choices=Role.choices)

    def __str__(self):
        return str(self.id)

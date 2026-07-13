from django.db import models
from django.utils.timezone import now
from datetime import timedelta
from base.models import BaseModel

# Create your models here.

class Team(BaseModel):
    name = models.CharField(max_length=255)
    members = models.ManyToManyField(to='users.CustomUser', through='teams.Membership', related_name='teams')

    def __str__(self):
        return str(self.id)

class Role(models.TextChoices):
    OWNER = 'owner', 'Owner'
    MAINTAINER = 'maintainer', 'Maintainer'
    MEMBER = 'member', 'Member'
    VIEWER = 'viewer', 'Viewer'

class Membership(BaseModel):
    user = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='memberships')
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=15, choices=Role.choices)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        constraints = [
            models.UniqueConstraint(fields=['user', 'team'], name='unique_user_membership_per_team')
        ]

    def __str__(self):
        return str(self.id)

class InvitationStatus(models.TextChoices):
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'
    PENDING = 'pending', 'Pending'
    CANCELLED = 'cancelled', 'Cancelled'

def default_invitation_expiry():
    return now() + timedelta(days=3)

class Invitation(BaseModel):
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='invites')
    role = models.CharField(max_length=15, choices=Role.choices)
    sender = models.ForeignKey(to='users.CustomUser', on_delete=models.SET_NULL, null=True, related_name='invites_sent')
    receiver = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='invites_received')
    expiry = models.DateTimeField(default=default_invitation_expiry)
    status = models.CharField(max_length=10, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        constraints = [
            models.CheckConstraint(condition=~models.Q(sender=models.F('receiver')), name='invite_sender_is_not_receiver'),
        ]

    @property
    def is_expired(self) -> bool:
        return now() >= self.expiry

    def __str__(self):
        return str(self.id)

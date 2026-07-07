from django.core.exceptions import ValidationError
from django.db import models
from django.utils.timezone import now, timedelta
from base.models import BaseModel

# Create your models here.

class Team(BaseModel):
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

class Membership(BaseModel):
    user = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='memberships')
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=15, choices=Role.choices, default=Role.VIEWER)

    class Meta(BaseModel.Meta):
        abstract = False
        constraints = [
            models.UniqueConstraint(fields=['user', 'team'], name='unique_user_team_membership')
        ]

    def __str__(self):
        return str(self.id)

class InvitationStatus(models.TextChoices):
    ACCEPTED = 'accepted'
    PENDING = 'pending'
    REJECTED = 'rejected'
    CANCELLED = 'cancelled'

def default_invitation_expiry():
    return now() + timedelta(days=3)

class Invitation(BaseModel):
    team = models.ForeignKey(to='teams.Team', on_delete=models.CASCADE, related_name='invites')
    role = models.CharField(max_length=15, choices=Role.choices, default=Role.VIEWER)
    sender = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='invites_sent')
    receiver = models.ForeignKey(to='users.CustomUser', on_delete=models.CASCADE, related_name='invites_received')
    expires_at = models.DateTimeField(default=default_invitation_expiry)
    status = models.CharField(max_length=10, choices=InvitationStatus.choices, default=InvitationStatus.PENDING)
    message = models.CharField(max_length=600)

    class Meta(BaseModel.Meta):
        abstract = False
        constraints = [
            models.UniqueConstraint(fields=['team', 'receiver', 'role'], condition=models.Q(status=InvitationStatus.PENDING), name='unique_team_receiver_role_invite'),
            models.CheckConstraint(condition=~models.Q(sender=models.F('receiver')), name='invite_sender_not_receiver'),
        ]

    @property
    def is_expired(self):
        return now() >= self.expires_at

    def clean(self):
        super().clean()
        if self.status == InvitationStatus.PENDING and Membership.objects.filter(user=self.receiver, team=self.team).exists():
            raise ValidationError({'receiver': 'This user is already a member of the team'})

    def save(self, *args, **kwargs) -> None:
        self.clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return str(self.id)

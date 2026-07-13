from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from users.models import CustomUser
from users.serializers import UserSerializer
from .models import Invitation, InvitationStatus, Membership, Role, Team

class TeamSerializer(serializers.ModelSerializer):
    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Team
        fields = '__all__'

class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Membership
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'team']

    def update(self, instance: Membership, validated_data):
        user_id = self.context['request'].user.pk
        team_id = instance.team_id  # pyright: ignore[reportAttributeAccessIssue]
        if instance.user_id == user_id:  # pyright: ignore[reportAttributeAccessIssue]
            raise PermissionDenied('Cannot change your own role.')
        if validated_data.get('role') == instance.role:
            raise ValidationError({'role': 'Role must change.'})
        if instance.role == Role.OWNER and not Membership.objects.filter(team_id=team_id, role=Role.OWNER).exclude(id=instance.id).exists():
            raise ValidationError({'role': 'There must be atleast one Owner.'})
        return super().update(instance, validated_data)

class InvitationSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    receiver = serializers.SlugRelatedField(slug_field='email', queryset=CustomUser.objects.all())

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Invitation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'team', 'sender', 'expiry', 'is_expired']

    def validate_receiver(self, receiver: CustomUser):
        team_id = self.context['view'].kwargs['team_id']
        if Membership.objects.filter(user_id=receiver.id, team_id=team_id).exists():
            raise serializers.ValidationError('This user is already a member of the team.')
        return receiver

    def validate_role(self, role):
        user_id = self.context['request'].user.pk
        team_id = self.context['view'].kwargs['team_id']
        if role == Role.OWNER and Membership.objects.filter(user_id=user_id, team_id=team_id, role=Role.MAINTAINER).exists():
            raise serializers.ValidationError({'role': 'Cannot Invite Owner as a Maintainer.'})
        return role

    def create(self, validated_data):
        validated_data['status'] = InvitationStatus.PENDING
        return super().create(validated_data)

    def update(self, instance: Invitation, validated_data):
        validated_data.pop('receiver', None)
        validated_data.pop('role', None)
        user_id = self.context['request'].user.pk
        if instance.is_expired:
            raise ValidationError({'status': 'Cannot change status for Expired Invites.'})
        if instance.status != InvitationStatus.PENDING:
            raise ValidationError({'status': 'Can only change status for Pending Invites.'})
        if validated_data.get('status') in {InvitationStatus.ACCEPTED, InvitationStatus.REJECTED} and instance.receiver_id != user_id:  # pyright: ignore[reportAttributeAccessIssue]
            raise PermissionDenied('Only the receiver can accept or reject Invites.')
        if validated_data.get('status') == InvitationStatus.PENDING:
            raise ValidationError({'status': 'Cannot set Invite Status to Pending.'})
        return super().update(instance, validated_data)

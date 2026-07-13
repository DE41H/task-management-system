from rest_framework.serializers import ModelSerializer, ReadOnlyField, ValidationError

from teams.models import Membership

from .models import Comment, Task


class TaskSerializer(ModelSerializer):
    is_overdue = ReadOnlyField()

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Task
        fields = '__all__'
        read_only_fields = ['project', 'creator']

    def validate_assignees(self, assignees):
        if not assignees:
            return assignees
        team_id = self.context['view'].kwargs['team_id']
        assignee_count = Membership.objects.filter(team_id=team_id, user__in=assignees).count()
        if assignee_count != len(set(assignees)):
            raise ValidationError('All assignees must be members of this team.')
        return assignees

class CommentSerializer(ModelSerializer):
    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Comment
        fields = '__all__'
        read_only_fields = ['author', 'task']

from rest_framework.serializers import ModelSerializer

from users.serializers import UserSerializer

from .models import Log

class LogSerializer(ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = Log
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'team', 'user', 'content']

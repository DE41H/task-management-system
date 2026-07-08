from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = CustomUser  # pyright: ignore[reportIncompatibleMethodOverride]
        fields = ['email', 'username', 'password']

    def create(self, validated_data):
        return CustomUser.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
        )

class UserSerializer(serializers.ModelSerializer):
    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = CustomUser
        fields = ['email', 'username']

class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(max_length=128, min_length=8, write_only=True, required=True, validators=[validate_password])
    old_password = serializers.CharField(max_length=128, min_length=8, write_only=True, required=True)

    def validate(self, attrs):
        user: CustomUser = self.context['request'].user
        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({'old_password': 'password is incorrect'})
        return super().validate(attrs)

    def update(self, instance: CustomUser, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save()
        return instance

from django.db import IntegrityError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import CustomUser
from django.contrib.auth.password_validation import validate_password

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(max_length=128, min_length=8, write_only=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = CustomUser
        fields = ['email', 'username', 'password']

    def validate(self, attrs):
        user = CustomUser(username=attrs['username'], email=attrs['email'])
        validate_password(attrs['password'], user=user)
        return super().validate(attrs)

    def create(self, validated_data):
        try:
            return CustomUser.objects.create_user(
                email=validated_data['email'],
                username=validated_data['username'],
                password=validated_data['password'],
            )
        except IntegrityError:
            raise ValidationError({'email': 'A user with this email or username already exists.'})

class UserSerializer(serializers.ModelSerializer):
    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = CustomUser
        fields = ['id', 'username', 'email', 'created_at', 'updated_at']

class ChangePasswordSerializer(serializers.ModelSerializer):
    new_password = serializers.CharField(max_length=128, min_length=8, write_only=True, required=True)
    old_password = serializers.CharField(max_length=128, min_length=8, write_only=True, required=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        model = CustomUser
        fields = ['old_password', 'new_password']

    def validate_old_password(self, old_password):
        user: CustomUser = self.context['request'].user
        if not user.check_password(old_password):
            raise ValidationError('Password is incorrect.')
        return old_password

    def validate_new_password(self, new_password):
        user: CustomUser = self.context['request'].user
        validate_password(password=new_password, user=user)
        return new_password

    def validate(self, attrs):
        if 'old_password' not in attrs or 'new_password' not in attrs:
            raise ValidationError('old_password and new_password are required.')
        return super().validate(attrs)

    def update(self, instance: CustomUser, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save()
        return instance

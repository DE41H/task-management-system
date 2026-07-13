from django.contrib.admin.decorators import register
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser

# Register your models here.

@register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['email', 'username']
    add_fieldsets = [
        [None, {'classes': ['wide'], 'fields': ['username', 'email', 'password1', 'password2']}]
    ]

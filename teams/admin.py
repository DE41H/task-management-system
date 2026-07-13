from django.contrib import admin

from .models import Invitation, Membership, Team

# Register your models here.

admin.site.register(Team)
admin.site.register(Membership)
admin.site.register(Invitation)

from django.contrib import admin
from .models import Team, Membership, Invitation

# Register your models here.

admin.site.register(Team)
admin.site.register(Membership)
admin.site.register(Invitation)

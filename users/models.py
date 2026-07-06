from django.db import models
from django.contrib.auth.models import AbstractUser
from uuid6 import uuid7

# Create your models here.

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
    email = models.EmailField(unique=True)

    def __str__(self):
        return str(self.id)

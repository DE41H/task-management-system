from django.contrib.auth.models import AbstractUser
from django.db import models

from base.models import BaseModel

# Create your models here.

class CustomUser(AbstractUser, BaseModel):  # pyright: ignore[reportIncompatibleVariableOverride]
    email = models.EmailField(unique=True)

    def __str__(self):
        return str(self.id)

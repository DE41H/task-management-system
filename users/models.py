from django.db import models
from django.contrib.auth.models import AbstractUser
from base.models import BaseModel

# Create your models here.

class CustomUser(BaseModel, AbstractUser):
    email = models.EmailField(unique=True)

    class Meta(BaseModel.Meta, AbstractUser.Meta):  # pyright: ignore[reportAttributeAccessIssue]
        abstract = False

    def __str__(self):
        return str(self.id)

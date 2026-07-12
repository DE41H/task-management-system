from django.db import models
from django.utils.timezone import now
from base.models import BaseModel

# Create your models here.

class TaskStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    ON_HOLD = 'on_hold', 'On Hold'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'

class TaskPriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'

class Task(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    project = models.ForeignKey(to='projects.Project', on_delete=models.CASCADE, related_name='tasks')
    assignees = models.ManyToManyField(to='users.CustomUser', blank=True, related_name='tasks')
    creator = models.ForeignKey(to='users.CustomUser', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=10, choices=TaskStatus.choices, default=TaskStatus.ACTIVE)
    priority = models.CharField(max_length=10, choices=TaskPriority.choices, default=TaskPriority.LOW)
    due = models.DateTimeField(null=True, blank=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        constraints = [
            models.UniqueConstraint(fields=['project', 'title'], name='unique_task_title_per_project')
        ]

    @property
    def is_overdue(self):
        return self.due is not None and self.due <= now()

    def __str__(self):
        return str(self.id)

class Comment(BaseModel):
    content = models.TextField()
    author = models.ForeignKey(to='users.CustomUser', on_delete=models.SET_NULL, null=True)
    task = models.ForeignKey(to='tasks.Task', on_delete=models.CASCADE, related_name='comments')

    def __str__(self):
        return str(self.id)

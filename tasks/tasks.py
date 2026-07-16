from anymail.exceptions import AnymailAPIError, AnymailRequestsAPIError
from celery import shared_task
from django.core.mail import send_mass_mail
from requests.exceptions import RequestException

from .models import Task, TaskStatus


@shared_task(autoretry_for=[RequestException, AnymailAPIError, AnymailRequestsAPIError], retry_backoff=True, max_retries=5)
def notify_task_assigned(task_id: str, user_ids: list[str]):
    task = Task.objects.select_related('project').get(id=task_id)
    emails = task.assignees.filter(id__in=user_ids).values_list('email', flat=True)
    mails = [
        (
            f'You have been assigned a task: {task.title}',
            f'You have been assigned the task "{task.title}" in project "{task.project.title}".',
            None,
            [email]
        ) for email in emails
    ]
    send_mass_mail(mails)

@shared_task(autoretry_for=[RequestException, AnymailAPIError, AnymailRequestsAPIError], retry_backoff=True, max_retries=5)
def notify_task_status_changed(task_id: str, old_status: str):
    task = Task.objects.select_related('project').get(id=task_id)
    emails = task.assignees.values_list('email', flat=True)
    mails = [
        (
            f'Task status updated: {task.title}',
            f'The task "{task.title}" in project "{task.project.title}" has changed from {TaskStatus(old_status).label} to {TaskStatus(task.status).label}.',
            None,
            [email],
        ) for email in emails
    ]
    send_mass_mail(mails)

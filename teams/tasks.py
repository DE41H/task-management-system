from anymail.exceptions import AnymailAPIError, AnymailRequestsAPIError
from celery import shared_task
from django.core.mail import send_mail
from django.utils.timezone import localtime
from requests.exceptions import RequestException

from .models import Invitation, Role


@shared_task(autoretry_for=[RequestException, AnymailAPIError, AnymailRequestsAPIError], retry_backoff=True, max_retries=5)
def notify_invitation(invitation_id: str):
    invitation = Invitation.objects.select_related('team', 'sender', 'receiver').get(id=invitation_id)
    sender = invitation.sender.username if invitation.sender else 'Someone'
    send_mail(
        subject=f'You have been invited to join {invitation.team.name}!',
        message=f'{sender} has invited you to join the team "{invitation.team.name}" as {Role(invitation.role).label}. This invitation expires on {localtime(invitation.expiry):%d %b %Y, %H:%M %Z}.',
        from_email=None,
        recipient_list=[invitation.receiver.email],
    )

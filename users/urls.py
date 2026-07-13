from django.urls import path
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import ChangePasswordView, RegisterView, UserInvitesView, UserView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserView.as_view(), name='user'),
    path('invites/', UserInvitesView.as_view(), name='user_invites'),
    path('password/', ChangePasswordView.as_view(), name='change_password'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
]

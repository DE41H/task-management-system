from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from teams.serializers import InvitationSerializer
from .serializers import RegisterSerializer, ChangePasswordSerializer, UserSerializer

# Create your views here.

class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ChangePasswordView(UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserInvitesView(ListAPIView):
    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.invites.order_by('-id').all()  # pyright: ignore[reportAttributeAccessIssue]

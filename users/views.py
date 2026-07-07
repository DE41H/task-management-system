from rest_framework.generics import CreateAPIView, UpdateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import RegisterSerializer, ChangePasswordSerializer, UserSerializer

# Create your views here.

class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

class ChangePasswordView(UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return self.request.user

class UserView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):  # pyright: ignore[reportIncompatibleMethodOverride]
        return self.request.user

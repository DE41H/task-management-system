import { Navigate, Route, Routes } from 'react-router-dom'

import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { ActivityPage } from './pages/ActivityPage'
import { HomeRedirect } from './pages/HomeRedirect'
import { LoginPage } from './pages/LoginPage'
import { MembersPage } from './pages/MembersPage'
import { MyInvitesPage } from './pages/MyInvitesPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'
import { TaskPage } from './pages/TaskPage'
import { TeamInvitesPage } from './pages/TeamInvitesPage'
import { TeamSettingsPage } from './pages/TeamSettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/inbox" element={<MyInvitesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/teams/:teamId">
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectPage />} />
            <Route path="projects/:projectId/tasks/:taskId" element={<TaskPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="invites" element={<TeamInvitesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="settings" element={<TeamSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

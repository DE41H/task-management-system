// One helper per backend endpoint — this file doubles as the coverage checklist.
import { api, clearTokens, getRefresh, setTokens } from './client'

export const Auth = {
  register: (body) => api('/auth/register/', { method: 'POST', body }),
  login: async (username, password) => {
    const tokens = await api('/auth/login/', { method: 'POST', body: { username, password } })
    setTokens(tokens)
    return tokens
  },
  logout: async () => {
    const refresh = getRefresh()
    if (refresh) await api('/auth/logout/', { method: 'POST', body: { refresh } }).catch(() => {})
    clearTokens()
  },
  me: () => api('/auth/me/'),
  updateMe: (body) => api('/auth/me/', { method: 'PATCH', body }),
  changePassword: (body) => api('/auth/password/', { method: 'PUT', body }),
  myInvites: (params) => api('/auth/invites/', { params }),
}

export const Teams = {
  list: (params) => api('/teams/', { params }),
  create: (body) => api('/teams/', { method: 'POST', body }),
  get: (teamId) => api(`/teams/${teamId}/`),
  update: (teamId, body) => api(`/teams/${teamId}/`, { method: 'PATCH', body }),
  remove: (teamId) => api(`/teams/${teamId}/`, { method: 'DELETE' }),
}

export const Members = {
  list: (teamId, params) => api(`/teams/${teamId}/members/`, { params }),
  get: (teamId, membershipId) => api(`/teams/${teamId}/members/${membershipId}/`),
  setRole: (teamId, membershipId, role) =>
    api(`/teams/${teamId}/members/${membershipId}/`, { method: 'PATCH', body: { role } }),
  remove: (teamId, membershipId) =>
    api(`/teams/${teamId}/members/${membershipId}/`, { method: 'DELETE' }),
}

export const Invites = {
  list: (teamId, params) => api(`/teams/${teamId}/invites/`, { params }),
  create: (teamId, body) => api(`/teams/${teamId}/invites/`, { method: 'POST', body }),
  get: (teamId, inviteId) => api(`/teams/${teamId}/invites/${inviteId}/`),
  setStatus: (teamId, inviteId, status) =>
    api(`/teams/${teamId}/invites/${inviteId}/`, { method: 'PATCH', body: { status } }),
}

export const Projects = {
  list: (teamId, params) => api(`/teams/${teamId}/projects/`, { params }),
  create: (teamId, body) => api(`/teams/${teamId}/projects/`, { method: 'POST', body }),
  get: (teamId, projectId) => api(`/teams/${teamId}/projects/${projectId}/`),
  update: (teamId, projectId, body) =>
    api(`/teams/${teamId}/projects/${projectId}/`, { method: 'PATCH', body }),
  remove: (teamId, projectId) =>
    api(`/teams/${teamId}/projects/${projectId}/`, { method: 'DELETE' }),
}

const taskBase = (teamId, projectId) => `/teams/${teamId}/projects/${projectId}/tasks/`

export const Tasks = {
  list: (teamId, projectId, params) => api(taskBase(teamId, projectId), { params }),
  create: (teamId, projectId, body) =>
    api(taskBase(teamId, projectId), { method: 'POST', body }),
  get: (teamId, projectId, taskId) => api(`${taskBase(teamId, projectId)}${taskId}/`),
  update: (teamId, projectId, taskId, body) =>
    api(`${taskBase(teamId, projectId)}${taskId}/`, { method: 'PATCH', body }),
  remove: (teamId, projectId, taskId) =>
    api(`${taskBase(teamId, projectId)}${taskId}/`, { method: 'DELETE' }),
}

export const Comments = {
  list: (teamId, projectId, taskId, params) =>
    api(`${taskBase(teamId, projectId)}${taskId}/comments/`, { params }),
  create: (teamId, projectId, taskId, body) =>
    api(`${taskBase(teamId, projectId)}${taskId}/comments/`, { method: 'POST', body }),
  update: (teamId, projectId, taskId, commentId, body) =>
    api(`${taskBase(teamId, projectId)}${taskId}/comments/${commentId}/`, { method: 'PATCH', body }),
  remove: (teamId, projectId, taskId, commentId) =>
    api(`${taskBase(teamId, projectId)}${taskId}/comments/${commentId}/`, { method: 'DELETE' }),
}

export const Logs = {
  list: (teamId, params) => api(`/teams/${teamId}/logs/`, { params }),
}

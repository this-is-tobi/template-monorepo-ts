import type { AddProjectMemberBody, CreateProjectBody, Project, ProjectMemberQuery, ProjectMemberWithUser, ProjectQuery, UpdateProjectBody, UpdateProjectMemberBody } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const total = ref<number>(0)
  const currentProject = ref<Project | null>(null)
  const members = ref<ProjectMemberWithUser[]>([])
  const totalMembers = ref<number>(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects(query?: Partial<ProjectQuery>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.getAll(query)
      projects.value = data.data
      total.value = data.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch projects'
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.getById(id)
      currentProject.value = data.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch project'
    } finally {
      loading.value = false
    }
  }

  async function createProject(body: CreateProjectBody) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.create(body)
      projects.value.push(data.data)
      return data.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create project'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateProject(id: string, body: UpdateProjectBody) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.update(id, body)
      const idx = projects.value.findIndex(p => p.id === id)
      if (idx !== -1) projects.value[idx] = data.data
      if (currentProject.value?.id === id) currentProject.value = data.data
      return data.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update project'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id: string) {
    loading.value = true
    error.value = null
    try {
      await apiClient.projects.delete(id)
      projects.value = projects.value.filter(p => p.id !== id)
      if (currentProject.value?.id === id) currentProject.value = null
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete project'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMembers(projectId: string, pagination?: Partial<ProjectMemberQuery>) {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.getMembers(projectId, pagination)
      members.value = data.data
      totalMembers.value = data.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch members'
    } finally {
      loading.value = false
    }
  }

  async function addMember(projectId: string, body: AddProjectMemberBody, pagination?: Partial<ProjectMemberQuery>) {
    loading.value = true
    error.value = null
    try {
      await apiClient.projects.addMember(projectId, body)
      await fetchMembers(projectId, pagination)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add member'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateMember(projectId: string, memberId: string, body: UpdateProjectMemberBody, pagination?: Partial<ProjectMemberQuery>) {
    loading.value = true
    error.value = null
    try {
      await apiClient.projects.updateMember(projectId, memberId, body)
      await fetchMembers(projectId, pagination)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update member'
      return false
    } finally {
      loading.value = false
    }
  }

  async function removeMember(projectId: string, memberId: string) {
    loading.value = true
    error.value = null
    try {
      await apiClient.projects.removeMember(projectId, memberId)
      members.value = members.value.filter(m => m.id !== memberId)
      totalMembers.value = Math.max(0, totalMembers.value - 1)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove member'
      return false
    } finally {
      loading.value = false
    }
  }

  return { projects, total, currentProject, members, totalMembers, loading, error, fetchProjects, fetchProject, createProject, updateProject, deleteProject, fetchMembers, addMember, updateMember, removeMember }
})

import type { CreateProjectBody, Project, UpdateProjectBody } from '@template-monorepo-ts/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const { data } = await apiClient.projects.getAll()
      projects.value = data.data
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

  return { projects, currentProject, loading, error, fetchProjects, fetchProject, createProject, updateProject, deleteProject }
})

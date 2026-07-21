<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmDialogHost from '~/components/ConfirmDialogHost.vue'
import { Toaster } from '~/components/ui/sonner'
import AuthLayout from '~/layouts/AuthLayout.vue'
import DefaultLayout from '~/layouts/DefaultLayout.vue'

const route = useRoute()
const layout = computed(() => route.meta.layout === 'auth' ? AuthLayout : DefaultLayout)
</script>

<template>
  <component :is="layout">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </component>
  <!-- Global feedback surfaces — mounted once for the whole app. -->
  <Toaster />
  <ConfirmDialogHost />
</template>

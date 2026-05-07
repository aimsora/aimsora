<script setup lang="ts">
import { cn } from "~/utils/cn";
</script>

<template>
  <div :class="cn('flex flex-col space-y-1 p-4', $attrs.class as string)">
    <slot />
  </div>
</template>

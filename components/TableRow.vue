<script setup lang="ts">
import { cn } from "~/utils/cn";
</script>

<template>
  <tr
    :class="
      cn(
        'border-b transition-colors hover:bg-muted/35 data-[state=selected]:bg-muted',
        $attrs.class as string
      )
    "
  >
    <slot />
  </tr>
</template>

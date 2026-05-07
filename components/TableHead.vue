<script setup lang="ts">
import { cn } from "~/utils/cn";
</script>

<template>
  <th
    :class="
      cn(
        'h-9 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        $attrs.class as string
      )
    "
  >
    <slot />
  </th>
</template>

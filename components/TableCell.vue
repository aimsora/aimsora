<script setup lang="ts">
import { cn } from "~/utils/cn";
</script>

<template>
  <td
    :class="
      cn('px-3 py-2 align-middle [&:has([role=checkbox])]:pr-0', $attrs.class as string)
    "
  >
    <slot />
  </td>
</template>

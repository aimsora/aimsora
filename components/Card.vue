<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "radix-vue";
import { cn } from "~/utils/cn";

withDefaults(defineProps<PrimitiveProps>(), {
  as: "div"
});
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('rounded-lg border bg-card text-card-foreground shadow-sm', $attrs.class as string)"
  >
    <slot />
  </Primitive>
</template>

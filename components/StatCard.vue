<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  hint: string;
}>();
</script>

<template>
  <Card>
    <CardHeader class="space-y-2">
      <CardDescription>{{ label }}</CardDescription>
      <CardTitle class="text-2xl leading-tight">{{ value }}</CardTitle>
      <p class="text-xs leading-5 text-muted-foreground">{{ hint }}</p>
    </CardHeader>
  </Card>
</template>

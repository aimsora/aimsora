<template>
  <Card>
    <CardHeader class="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="space-y-1">
        <CardTitle class="text-base">Фильтры</CardTitle>
        <CardDescription>Уточните выборку перед загрузкой таблицы.</CardDescription>
      </div>
      <slot name="meta" />
    </CardHeader>
    <CardContent class="pt-4">
      <slot />
    </CardContent>
  </Card>
</template>

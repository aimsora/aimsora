<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppTopbar />
      <main class="container flex-1 py-4">
        <div class="flex flex-col gap-4">
          <slot />
        </div>
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>

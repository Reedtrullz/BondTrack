export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startNotificationMonitor } = await import('@/lib/notifications/monitor');
  startNotificationMonitor();
}

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { runNotificationMonitorPass } from '@/lib/notifications/monitor';

vi.mock('@/lib/notifications/monitor', () => ({
  runNotificationMonitorPass: vi.fn(),
}));

describe('/api/internal/notifications/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HEIMDALL_NOTIFICATION_RUNNER_TOKEN;
  });

  it('requires the configured runner bearer token', async () => {
    process.env.HEIMDALL_NOTIFICATION_RUNNER_TOKEN = 'runner-secret';

    const response = await POST(new NextRequest('http://localhost/api/internal/notifications/run', {
      method: 'POST',
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Notification runner token required' });
    expect(runNotificationMonitorPass).not.toHaveBeenCalled();
  });

  it('runs one monitor pass when authorized', async () => {
    process.env.HEIMDALL_NOTIFICATION_RUNNER_TOKEN = 'runner-secret';

    const response = await POST(new NextRequest('http://localhost/api/internal/notifications/run', {
      method: 'POST',
      headers: { authorization: 'Bearer runner-secret' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(runNotificationMonitorPass).toHaveBeenCalledTimes(1);
  });
});

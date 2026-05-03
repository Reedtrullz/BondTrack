// Coolify API Client
// Documentation: https://coolify.io/docs/api-reference
// Once you provide the API key, I can use this to:
// - Check deployment status
// - Trigger redeployments
// - View logs
// - Manage environment variables

export interface CoolifyConfig {
  baseUrl: string; // e.g., https://your-coolify-instance.com
  apiToken: string; // Bearer token
}

export interface CoolifyProject {
  id: string;
  name: string;
  description: string;
  status: string;
}

export interface CoolifyDeployment {
  id: string;
  project_id: string;
  status: 'queued' | 'in_progress' | 'finished' | 'failed';
  created_at: string;
  updated_at: string;
}

export class CoolifyClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: CoolifyConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
    this.headers = {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Example: List all projects
  async listProjects(): Promise<CoolifyProject[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/projects`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to list projects: ${response.statusText}`);
    }
    return response.json();
  }

  // Example: Get deployment status
  async getDeployment(deploymentId: string): Promise<CoolifyDeployment> {
    const response = await fetch(`${this.baseUrl}/api/v1/deployments/${deploymentId}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to get deployment: ${response.statusText}`);
    }
    return response.json();
  }

  // Example: Trigger redeployment
  async redeploy(applicationId: string): Promise<{ deployment_id: string }> {
    const response = await fetch(`${this.baseUrl}/api/v1/applications/${applicationId}/deploy`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger deployment: ${response.statusText}`);
    }
    return response.json();
  }
}

// Usage (once you provide the API key):
// const client = new CoolifyClient({
//   baseUrl: 'https://your-coolify-instance.com',
//   apiToken: 'your-api-key-here',
// });
// const projects = await client.listProjects();

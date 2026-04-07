/**
 * Kuaishou Publisher - Pure HTTP API implementation
 * No browser/Playwright needed - uses cookies from prior login session
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';

// Profile → Source Task mapping (from legacy system)
const PROFILE_SOURCE_TASKS: Record<string, string> = {
  nanrenbao: '165805',
  'elder-love': '183044',
  'parent-tools': '186229',
  womanai: '188816',
};

interface PublishConfig {
  profileId: string;
  appId: string;
  appName: string;
  description?: string;
}

interface PublishResult {
  success: boolean;
  planId?: string;
  error?: string;
}

export class KuaishouPublisher {
  private cookies: string = '';
  private baseUrl = 'https://daren.kuaishou.com';

  constructor(private config: PublishConfig) {}

  async publish(): Promise<PublishResult> {
    try {
      // 1. Extract cookies from auth file
      this.cookies = this.extractCookies();
      
      // 2. Get source task details
      const sourceTaskId = this.getSourceTaskId();
      const sourceDetails = await this.fetchSourceTask(sourceTaskId);
      
      // 3. Create new task with modified details
      const planId = await this.createTask(sourceDetails);
      
      return {
        success: true,
        planId,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private extractCookies(): string {
    const authFile = join(PATHS.auth, 'kuaishou_auth.json');
    
    try {
      const content = readFileSync(authFile, 'utf-8');
      const state = JSON.parse(content);
      
      const cookies = (state.cookies || [])
        .filter((c: { domain?: string }) => c.domain?.includes('kuaishou.com'))
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join('; ');
      
      if (!cookies) {
        throw new Error('No kuaishou cookies found in auth file. Run login first.');
      }
      
      return cookies;
    } catch (e) {
      if ((e as Error).message.includes('ENOENT')) {
        throw new Error(`Auth file not found: ${authFile}. Run kuaishou-login skill first.`);
      }
      throw e;
    }
  }

  private getSourceTaskId(): string {
    return PROFILE_SOURCE_TASKS[this.config.profileId] || '165805';
  }

  private async fetchSourceTask(taskId: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/rest/v2/distribution-plan/${taskId}`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': this.cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch source task: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result === 109) {
      throw new Error('SESSION_EXPIRED: Please re-login to Kuaishou');
    }

    return data.data || data;
  }

  private async createTask(sourceDetails: unknown): Promise<string> {
    const sourceTaskId = this.getSourceTaskId();
    
    // Build request body based on source task
    const body = this.buildCreateRequest(sourceDetails, sourceTaskId);

    const response = await fetch(`${this.baseUrl}/rest/v2/distribution-plan/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': this.cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': `https://daren.kuaishou.com/distribution-plan-create/recreate/${sourceTaskId}`,
        'Origin': this.baseUrl,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result === 109) {
      throw new Error('SESSION_EXPIRED: Please re-login to Kuaishou');
    }

    if (data.result !== 1 && data.result !== 200) {
      throw new Error(`API error: ${data.error_msg || JSON.stringify(data)}`);
    }

    return data.data?.planId || data.planId || 'unknown';
  }

  private buildCreateRequest(sourceDetails: unknown, sourceTaskId: string): Record<string, unknown> {
    const source = sourceDetails as Record<string, unknown>;
    
    // Clone and modify the source task
    const request: Record<string, unknown> = {
      ...source,
      sourceTaskId,
      name: this.config.appName,
      description: this.config.description || `${this.config.appName} - 参与投票`,
      externalUrl: `https://letmetryai.cn/${this.config.appId}/`,
    };

    // Remove IDs that shouldn't be copied
    delete request.planId;
    delete request.id;
    delete request.createTime;
    delete request.updateTime;

    return request;
  }
}

// Convenience function
export async function publishToKuaishou(
  profileId: string,
  appId: string,
  appName: string,
  description?: string
): Promise<PublishResult> {
  const publisher = new KuaishouPublisher({
    profileId,
    appId,
    appName,
    description,
  });
  
  return publisher.publish();
}

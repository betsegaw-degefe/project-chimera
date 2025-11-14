import { AgentInfo } from './types';

export class AgentRegistry {
  private agents: Map<string, AgentInfo> = new Map();

  register(agentInfo: AgentInfo): void {
    this.agents.set(agentInfo.name, agentInfo);
    console.log(`✅ Agent registered: ${agentInfo.name} at ${agentInfo.url}`);
  }

  get(name: string): AgentInfo | undefined {
    return this.agents.get(name);
  }

  getAll(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  clear(): void {
    this.agents.clear();
  }
}

export const agentRegistry = new AgentRegistry();


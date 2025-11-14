export interface Tool {
  name: string;
  description: string;
  input: string;
}

export interface AgentInfo {
  name: string;
  url: string;
  tools: Tool[];
}

export interface PlanStep {
  agent: string;
  task: string;
  inputFrom: string;
  dependsOn?: string;
}

export interface RegisterRequest {
  name: string;
  url: string;
  tools: Tool[];
}

export interface PlanAndRunRequest {
  request: string;
  data?: any;
}


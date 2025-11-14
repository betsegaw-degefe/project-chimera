import axios from 'axios';
import { PlanStep } from './types';
import { agentRegistry } from './registry';

export class Executor {
  async executePlan(plan: PlanStep[], initialData: any): Promise<any> {
    const results: Record<string, any> = {};
    const executionTrace: string[] = [];

    console.log('\n🚀 Executing plan...\n');

    for (let i = 0; i < plan.length; i++) {
      const step = plan[i];
      console.log(`📍 Step ${i + 1}: ${step.agent} (${step.task})`);

      const agent = agentRegistry.get(step.agent);
      if (!agent) {
        const error = `Agent ${step.agent} not found in registry`;
        console.error(`❌ ${error}`);
        throw new Error(error);
      }

      // Prepare input based on dependency
      let input;
      if (step.inputFrom === 'user') {
        input = initialData;
      } else {
        // Get output from previous agent
        input = results[step.inputFrom];
        if (!input) {
          throw new Error(`Dependency not met: ${step.inputFrom} has no results`);
        }
      }

      try {
        // Determine endpoint based on task
        const endpoint = this.getEndpointForTask(step.agent, step.task);
        const url = `${agent.url}${endpoint}`;
        
        console.log(`  → Calling ${url}`);
        
        const response = await axios.post(url, { data: input }, {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json' }
        });

        results[step.agent] = response.data;
        executionTrace.push(`${step.agent}: ${JSON.stringify(response.data.summary || response.data.message || 'completed')}`);
        
        console.log(`  ✓ Success\n`);
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.message;
        console.error(`  ✗ Error: ${errorMsg}\n`);
        throw new Error(`Failed to execute ${step.agent}: ${errorMsg}`);
      }
    }

    return {
      success: true,
      results,
      executionTrace
    };
  }

  private getEndpointForTask(agent: string, task: string): string {
    const endpointMap: Record<string, string> = {
      'sanitizer': '/sanitize',
      'log-analyzer': '/analyze',
      'report-generator': '/generate-report'
    };

    return endpointMap[agent] || `/${task}`;
  }
}

export const executor = new Executor();


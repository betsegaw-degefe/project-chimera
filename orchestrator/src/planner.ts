import { PlanStep } from './types';

/**
 * Simple rule-based planner that uses keyword matching
 * to determine which agents should be involved
 */
export class Planner {
  generatePlan(request: string): PlanStep[] {
    const plan: PlanStep[] = [];
    const lowerRequest = request.toLowerCase();

    // Keyword detection
    const needsSanitizer = /sanitize|sensitive|pii|personal/i.test(lowerRequest);
    const needsLogAnalyst = /logs?|analyze|errors?|warnings?/i.test(lowerRequest);
    const needsReport = /summary|report|visual|brief|chart/i.test(lowerRequest);

    console.log('🔍 Planning based on keywords:');
    console.log(`  - Sanitizer needed: ${needsSanitizer}`);
    console.log(`  - Log Analyst needed: ${needsLogAnalyst}`);
    console.log(`  - Report needed: ${needsReport}`);

    // Build execution plan with dependencies
    // Note: Log Analyst will call Sanitizer internally if needed
    
    if (needsLogAnalyst) {
      plan.push({
        agent: 'log-analyzer',
        task: 'analyze',
        inputFrom: 'user',
      });
    }

    if (needsReport && needsLogAnalyst) {
      plan.push({
        agent: 'report-generator',
        task: 'generate',
        inputFrom: 'log-analyzer',
        dependsOn: 'log-analyzer'
      });
    } else if (needsReport) {
      plan.push({
        agent: 'report-generator',
        task: 'generate',
        inputFrom: 'user'
      });
    }

    // If only sanitization is needed (edge case)
    if (needsSanitizer && !needsLogAnalyst && !needsReport) {
      plan.push({
        agent: 'sanitizer',
        task: 'sanitize',
        inputFrom: 'user'
      });
    }

    return plan;
  }
}

export const planner = new Planner();


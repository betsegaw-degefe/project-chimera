import express, { Request, Response } from 'express';
import cors from 'cors';
import { agentRegistry } from './registry';
import { planner } from './planner';
import { executor } from './executor';
import { RegisterRequest, PlanAndRunRequest } from './types';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * POST /register
 * Agents call this endpoint to register themselves
 */
app.post('/register', (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { name, url, tools } = req.body;

    if (!name || !url || !tools) {
      return res.status(400).json({
        error: 'Missing required fields: name, url, tools'
      });
    }

    agentRegistry.register({ name, url, tools });

    res.json({
      success: true,
      message: `Agent ${name} registered successfully`,
      agent: { name, url, tools }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /agents
 * Debug endpoint to list all registered agents
 */
app.get('/agents', (_req: Request, res: Response) => {
  const agents = agentRegistry.getAll();
  res.json({
    count: agents.length,
    agents
  });
});

/**
 * POST /plan-and-run
 * Main orchestration endpoint
 * Receives a natural language request, plans execution, and runs it
 */
app.post('/plan-and-run', async (req: Request<{}, {}, PlanAndRunRequest>, res: Response) => {
  try {
    const { request, data } = req.body;

    if (!request) {
      return res.status(400).json({ error: 'Missing required field: request' });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📨 Received request:', request);
    console.log('='.repeat(60));

    // Step 1: Generate plan
    const plan = planner.generatePlan(request);
    
    if (plan.length === 0) {
      return res.json({
        message: 'No agents matched the request',
        plan: [],
        results: {}
      });
    }

    console.log('\n📋 Generated Plan:');
    console.log(JSON.stringify(plan, null, 2));

    // Step 2: Execute plan
    const executionResult = await executor.executePlan(plan, data || request);

    console.log('\n✅ Execution Complete!');
    console.log('='.repeat(60) + '\n');

    // Step 3: Return results
    res.json({
      request,
      plan,
      ...executionResult
    });

  } catch (error: any) {
    console.error('❌ Execution error:', error.message);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'orchestrator' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '━'.repeat(60));
  console.log('🎭 PROJECT CHIMERA - MCP ORCHESTRATOR');
  console.log('━'.repeat(60));
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /register        - Agent registration`);
  console.log(`   GET  /agents          - List registered agents`);
  console.log(`   POST /plan-and-run    - Execute orchestration`);
  console.log(`   GET  /health          - Health check`);
  console.log('━'.repeat(60) + '\n');
  console.log('⏳ Waiting for agents to register...\n');
});


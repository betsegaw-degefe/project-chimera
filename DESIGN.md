# Project Chimera - Design Document 🏗️

## Executive Summary

Project Chimera is a multi-agent orchestration system inspired by the Model Context Protocol (MCP). It demonstrates how autonomous AI agents can collaborate through a central coordinator while maintaining the ability to communicate directly with each other. The system showcases intelligent planning, dynamic service discovery through self-registration, and dependency-aware execution.

## Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                     CLIENT / USER                              │
│                                                                │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            │ POST /plan-and-run
                            │ { request: "Analyze logs..." }
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                   MCP ORCHESTRATOR (Port 5000)                 │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Registry   │  │   Planner    │  │   Executor   │        │
│  │              │  │              │  │              │        │
│  │ Map<name,    │  │ Keyword-based│  │ Sequential   │        │
│  │  AgentInfo>  │  │ rule engine  │  │ execution    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                │
│  Endpoints: /register, /plan-and-run, /agents                 │
└─────────┬──────────────────┬──────────────────┬───────────────┘
          │                  │                  │
          │ Auto-register    │ Delegate tasks   │ Delegate tasks
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   SANITIZER      │  │  LOG ANALYZER    │  │ REPORT GENERATOR │
│   Port 5001      │  │   Port 5002      │  │   Port 5003      │
│                  │  │                  │  │                  │
│ Tool: sanitize   │  │ Tool: analyze    │  │ Tool: generate   │
│                  │  │                  │  │                  │
│ • Remove emails  │  │ • Parse logs     │  │ • Create summary │
│ • Strip IPs      │  │ • Find errors    │  │ • ASCII charts   │
│ • Redact PII     │  │ • Count warnings │  │ • Health scores  │
└──────────────────┘  └─────────┬────────┘  └──────────────────┘
          ▲                     │
          │                     │
          └─────────────────────┘
           DIRECT AGENT-TO-AGENT CALL
           (HTTP POST /sanitize)
```

## System Components

### 1. MCP Orchestrator

**Responsibility:** Central coordinator that manages agent discovery, plans execution, and aggregates results.

**Key Modules:**

#### Registry (registry.ts)
- **Data Structure:** In-memory `Map<string, AgentInfo>`
- **Purpose:** Dynamic service discovery
- **Operations:**
  - `register(agentInfo)` - Store agent metadata
  - `get(name)` - Retrieve agent by name
  - `getAll()` - List all registered agents

```typescript
interface AgentInfo {
  name: string;
  url: string;
  tools: Tool[];
}
```

#### Planner (planner.ts)
- **Algorithm:** Keyword-based rule matching
- **Input:** Natural language request string
- **Output:** Ordered array of execution steps

**Planning Rules:**
```
IF request contains ["logs", "analyze", "errors"]
  THEN include log-analyzer

IF request contains ["report", "summary", "visual", "brief"]
  THEN include report-generator
  AND set dependency on log-analyzer if present

IF request contains ["sanitize", "sensitive", "pii"]
  AND log-analyzer NOT included
  THEN include sanitizer explicitly
```

**Plan Structure:**
```typescript
interface PlanStep {
  agent: string;        // Target agent name
  task: string;         // Task/tool to execute
  inputFrom: string;    // Data source: "user" or agent name
  dependsOn?: string;   // Optional dependency
}
```

#### Executor (executor.ts)
- **Algorithm:** Sequential execution with dependency resolution
- **Features:**
  - Waits for dependencies to complete
  - Passes data between agents
  - Collects and aggregates results
  - Error handling and timeout management

**Execution Flow:**
```
FOR each step in plan:
  1. Resolve agent from registry
  2. Prepare input (from user or previous agent)
  3. Call agent's endpoint via HTTP POST
  4. Store result
  5. Continue to next step
```

### 2. Agent Architecture

Each agent is an autonomous microservice with:

#### Common Features
- **Self-Registration:** Calls orchestrator's `/register` on startup
- **HTTP API:** Express server exposing tool endpoints
- **Health Checks:** `/health` endpoint for monitoring
- **Info Endpoint:** `/info` returns agent metadata

#### Agent: Sanitizer (Port 5001)

**Purpose:** Remove PII and sensitive information from text

**Tool:** `POST /sanitize`

**Implementation:**
```typescript
Patterns detected:
  - Emails (regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
  - IPv4 addresses
  - SSNs (XXX-XX-XXXX)
  - Phone numbers
  - Credit cards
  - API keys (32+ char alphanumeric)

Algorithm:
  1. Scan input text for each pattern
  2. Replace matches with [REDACTED_TYPE]
  3. Track what was removed
  4. Return sanitized text + metadata
```

**Output:**
```json
{
  "sanitized": "ERROR: User [REDACTED_EMAIL] from [REDACTED_IPV4]",
  "removed": ["email: john@...", "ipv4: 192..."],
  "count": 2
}
```

#### Agent: Log Analyzer (Port 5002)

**Purpose:** Analyze system logs for errors, warnings, and critical issues

**Tool:** `POST /analyze`

**Key Feature:** ⚡ **Calls Sanitizer directly (agent-to-agent communication)**

**Implementation:**
```typescript
Algorithm:
  1. Receive raw log data
  2. CALL Sanitizer agent directly:
     axios.post('http://localhost:5001/sanitize', { data: logs })
  3. Analyze sanitized logs:
     - Pattern match: CRITICAL, ERROR, WARNING, INFO
     - Count occurrences
     - Extract sample lines
  4. Return analysis + sanitization metadata
```

**Pattern Matching:**
```typescript
{
  critical: /\b(fatal|critical|panic|crash|emergency)\b/gi,
  error: /\b(error|failed|failure|exception)\b/gi,
  warning: /\b(warning|warn|deprecated)\b/gi
}
```

**Output:**
```json
{
  "analysis": {
    "critical": 1,
    "errors": 2,
    "warnings": 3,
    "findings": { ... }
  },
  "sanitization": {
    "count": 4,
    "message": "Sanitized 4 sensitive items"
  },
  "agentToAgentCall": {
    "called": "sanitizer",
    "success": true
  }
}
```

#### Agent: Report Generator (Port 5003)

**Purpose:** Create executive summaries and visual assets

**Tool:** `POST /generate-report`

**Implementation:**
```typescript
Algorithm:
  1. Extract analysis data from input
  2. Calculate health score:
     score = 100 - (critical×3 + errors×2 + warnings) × 5
  3. Generate recommendations based on findings
  4. Create ASCII bar chart visualization
  5. Format executive summary

Health Score Thresholds:
  > 80: 🟢 Healthy
  50-80: 🟡 Needs Attention
  < 50: 🔴 Critical
```

**Visual Asset Example:**
```
📊 Visual Asset - System Health Chart
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Critical:    ███                           (1)
Errors:      ██████                        (2)
Warnings:    █████████                     (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Communication Patterns

### 1. Agent Self-Registration

**Flow:**
```
Agent Startup
    ↓
Wait 2 seconds (ensure orchestrator is ready)
    ↓
POST /register to orchestrator
    ↓
Orchestrator stores in registry
    ↓
Agent ready to receive tasks
```

**Registration Payload:**
```json
{
  "name": "log-analyzer",
  "url": "http://localhost:5002",
  "tools": [
    {
      "name": "analyze",
      "description": "Analyzes system logs for errors and warnings",
      "input": "{ data: string }"
    }
  ]
}
```

### 2. Orchestration Flow

**Complete Request Flow:**
```
1. User → POST /plan-and-run
   {
     "request": "Analyze logs and generate report",
     "data": "<log contents>"
   }

2. Orchestrator → Planner
   → Generates plan:
   [
     { agent: "log-analyzer", inputFrom: "user" },
     { agent: "report-generator", inputFrom: "log-analyzer", dependsOn: "log-analyzer" }
   ]

3. Orchestrator → Executor
   
   Step 1:
   → POST /analyze to log-analyzer
   → Log Analyzer → POST /sanitize to sanitizer (AGENT-TO-AGENT!)
   → Sanitizer → returns sanitized data
   → Log Analyzer → returns analysis
   → Executor stores result
   
   Step 2:
   → POST /generate-report to report-generator
   → Input: results from log-analyzer
   → Report Generator → returns summary + chart
   → Executor stores result

4. Orchestrator → Aggregates results → Returns to user
```

### 3. Agent-to-Agent Communication ⚡

**Critical Requirement Implementation:**

The Log Analyzer demonstrates true agent autonomy by calling the Sanitizer directly:

```typescript
// log-analyzer/src/index.ts
app.post('/analyze', async (req, res) => {
  const { data } = req.body;
  
  // DIRECT HTTP CALL TO ANOTHER AGENT
  const sanitizeResponse = await axios.post(
    'http://localhost:5001/sanitize',
    { data }
  );
  
  const sanitizedData = sanitizeResponse.data.sanitized;
  
  // Continue with analysis...
});
```

**Why This Matters:**
- Demonstrates agent autonomy
- Reduces orchestrator bottleneck
- Enables complex agent workflows
- Mimics real distributed AI systems

## Technology Choices

### Node.js + TypeScript + Express

**Rationale:**
- **Fast Development:** Express is minimal and quick to implement
- **Type Safety:** TypeScript prevents errors and improves code quality
- **Familiarity:** Well-known stack, easy for reviewers to understand
- **Flexibility:** HTTP/REST is simple and universal
- **Clear Focus:** No framework overhead, emphasis on orchestration logic

**Trade-offs:**
- ✅ Simple, transparent code
- ✅ Easy to run and test
- ❌ No built-in dependency injection (vs NestJS)
- ❌ Manual error handling patterns

### In-Memory Registry

**Rationale:**
- Sufficient for prototype/demo
- Fast lookups (O(1) with Map)
- No external dependencies
- Meets 2-4 hour time constraint

**Production Considerations:**
- Replace with Redis for persistence
- Add TTL for stale agents
- Implement health checks

### Rule-Based Planning

**Current Implementation:** Keyword matching with regex

**Why Not Real LLM?**
- Focuses on orchestration architecture
- Predictable for demo purposes
- No API costs or latency
- Easy to understand and modify

**Future Enhancement:**
```typescript
// Integration with OpenAI
const plan = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{
    role: "system",
    content: "You are a task planner. Given a request and available agents, create an execution plan..."
  }],
  functions: [planningFunctionSchema]
});
```

## Scaling and Production Considerations

### 1. Horizontal Scaling

**Current:** Single instance of each component

**Production Approach:**
```
┌─────────────────────────────────────────┐
│         Load Balancer / API Gateway     │
└────────────┬────────────────────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
┌─────────┐     ┌─────────┐
│ Orch 1  │     │ Orch 2  │
└────┬────┘     └────┬────┘
     │               │
     └───────┬───────┘
             ▼
     ┌──────────────┐
     │ Redis/Consul │  ← Shared registry
     │ (Service     │
     │  Discovery)  │
     └──────┬───────┘
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
┌────────┐ ┌────────┐ ┌────────┐
│Agent 1a│ │Agent 2a│ │Agent 3a│
└────────┘ └────────┘ └────────┘
┌────────┐ ┌────────┐ ┌────────┐
│Agent 1b│ │Agent 2b│ │Agent 3b│
└────────┘ └────────┘ └────────┘
```

**Changes Needed:**
- Replace in-memory Map with Redis
- Add load balancing for agents
- Implement service discovery (Consul/etcd)
- Add circuit breakers for agent calls

### 2. Reliability & Fault Tolerance

**Current Limitations:**
- No retry logic
- No timeout handling beyond basic axios timeout
- Single point of failure (orchestrator)
- No persistent state

**Production Enhancements:**

```typescript
// Retry with exponential backoff
async function callAgentWithRetry(url: string, data: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios.post(url, data, { timeout: 5000 });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}

// Circuit breaker pattern
class CircuitBreaker {
  // Prevent cascading failures
  // Open circuit after N failures
  // Half-open for health checks
}

// Dead letter queue for failed tasks
interface FailedTask {
  request: string;
  plan: PlanStep[];
  error: string;
  timestamp: Date;
}
```

### 3. Real LLM Integration

**Architecture for Production AI:**

```typescript
// Enhanced planner with GPT-4
class LLMPlanner {
  async generatePlan(request: string, availableAgents: AgentInfo[]): Promise<PlanStep[]> {
    const agentDescriptions = availableAgents.map(a => ({
      name: a.name,
      tools: a.tools.map(t => `${t.name}: ${t.description}`)
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a task orchestrator. Given a user request and available agents, 
                    create an optimal execution plan considering dependencies.`
        },
        {
          role: "user",
          content: `Request: ${request}\n\nAvailable agents:\n${JSON.stringify(agentDescriptions, null, 2)}`
        }
      ],
      functions: [{
        name: "create_execution_plan",
        parameters: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  agent: { type: "string" },
                  task: { type: "string" },
                  inputFrom: { type: "string" },
                  dependsOn: { type: "string" }
                }
              }
            }
          }
        }
      }],
      function_call: { name: "create_execution_plan" }
    });

    return JSON.parse(completion.choices[0].message.function_call.arguments).steps;
  }
}
```

### 4. Security Considerations

**Current State:** No authentication or authorization

**Production Requirements:**

```typescript
// 1. API Key authentication
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// 2. Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// 3. Input validation
import Joi from 'joi';
const planAndRunSchema = Joi.object({
  request: Joi.string().min(10).max(1000).required(),
  data: Joi.string().max(1000000)
});

// 4. Agent authentication
// Agents should authenticate with orchestrator using JWT/mTLS
```

### 5. Monitoring & Observability

**Production Additions:**

```typescript
// OpenTelemetry integration
import { trace } from '@opentelemetry/api';

app.post('/plan-and-run', async (req, res) => {
  const span = trace.getTracer('orchestrator').startSpan('plan-and-run');
  
  try {
    // ... execution logic
    span.addEvent('plan_generated', { stepCount: plan.length });
    
  } finally {
    span.end();
  }
});

// Prometheus metrics
import promClient from 'prom-client';
const requestDuration = new promClient.Histogram({
  name: 'orchestrator_request_duration_seconds',
  help: 'Duration of orchestration requests',
  labelNames: ['status']
});
```

## Extension Opportunities

### 1. Async Execution

Replace synchronous execution with message queue:

```
User Request → Orchestrator → Queue (RabbitMQ/SQS)
                                  ↓
                            Worker Pool executes plan
                                  ↓
                          Results stored in database
                                  ↓
                          Webhook callback to user
```

### 2. Parallel Execution

For independent agents:

```typescript
// Current: Sequential
for (const step of plan) {
  await executeStep(step);
}

// Enhanced: Parallel when possible
const parallelGroups = groupByDependencies(plan);
for (const group of parallelGroups) {
  await Promise.all(group.map(step => executeStep(step)));
}
```

### 3. Streaming Responses

For long-running tasks:

```typescript
app.post('/plan-and-run', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  
  for (const step of plan) {
    res.write(`event: progress\ndata: ${JSON.stringify({ step })}\n\n`);
    const result = await executeStep(step);
    res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`);
  }
  
  res.end();
});
```

### 4. Agent Versioning

Support multiple versions of agents:

```typescript
interface AgentInfo {
  name: string;
  version: string;  // NEW
  url: string;
  tools: Tool[];
}

// Registry: Map<string, Map<string, AgentInfo>>
//           ^name       ^version
```

## Conclusion

Project Chimera demonstrates a functional multi-agent orchestration system that balances simplicity with sophistication. The architecture showcases:

- ✅ Dynamic service discovery through self-registration
- ✅ Intelligent planning with clear execution flow
- ✅ True agent autonomy via direct inter-agent communication
- ✅ Dependency-aware execution
- ✅ Clean, maintainable TypeScript implementation
- ✅ Clear path to production scaling

The system serves as a foundation for understanding how distributed AI agents can collaborate, while remaining simple enough to implement in 2-4 hours as a take-home assignment.

---

**Author's Note:** This design prioritizes clarity and working logic over production-grade features, as specified in the assignment requirements. The scaling and production sections demonstrate understanding of real-world considerations while acknowledging the prototype nature of this implementation.


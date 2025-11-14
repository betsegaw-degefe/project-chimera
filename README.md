# Project Chimera 🧬

A multi-agent orchestration system demonstrating MCP-inspired architecture where autonomous agents collaborate through a central orchestrator.

## 🎯 Overview

Project Chimera implements a distributed AI system with:
- **1 Orchestrator** - Central MCP coordinator with intelligent planning
- **3 Specialized Agents** - Autonomous microservices with self-registration
- **Agent-to-Agent Communication** - Direct inter-agent calls (not just orchestrator-mediated)
- **Dynamic Planning** - Rule-based planner determines execution flow

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 MCP ORCHESTRATOR                    │
│                  (Port 5000)                        │
│                                                     │
│  • POST /register      - Agent registration        │
│  • POST /plan-and-run  - Orchestration entry point │
│  • GET  /agents        - List registered agents    │
└────────────┬─────────────────────────┬──────────────┘
             │                         │
             ├─────────────────────────┼──────────────┐
             │                         │              │
             ▼                         ▼              ▼
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│  SANITIZER AGENT   │◄──│ LOG ANALYZER AGENT │   │ REPORT GENERATOR   │
│    (Port 5001)     │   │    (Port 5002)     │   │     (Port 5003)    │
│                    │   │                    │   │                    │
│ • Removes PII      │   │ • Analyzes logs    │   │ • Creates summary  │
│ • Strips sensitive │   │ • Finds errors     │   │ • Visual assets    │
│   data             │   │ • CALLS SANITIZER  │   │                    │
│                    │   │   DIRECTLY ⚡      │   │                    │
└────────────────────┘   └────────────────────┘   └────────────────────┘
                              Agent-to-Agent
                              Communication!
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- TypeScript knowledge (helpful but not required)

### Installation

```bash
# Install all dependencies (orchestrator + all agents)
npm run install:all

# Build all TypeScript projects
npm run build:all
```

### Running the System

You need to start each service in a separate terminal:

**Terminal 1 - Start Orchestrator:**
```bash
npm run start:orchestrator
```

**Terminal 2 - Start Sanitizer Agent:**
```bash
npm run start:sanitizer
```

**Terminal 3 - Start Log Analyzer Agent:**
```bash
npm run start:log-analyzer
```

**Terminal 4 - Start Report Generator Agent:**
```bash
npm run start:report-generator
```

### Verify Setup

All agents should auto-register with the orchestrator. Check registration status:

```bash
curl http://localhost:5000/agents
```

## 🧪 Testing the System

### Example 1: Full Intelligence Brief

```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze system logs for errors, sanitize sensitive data, and generate a report with visual",
    "data": "2024-01-15 ERROR: Database connection failed for user john.doe@company.com from IP 192.168.1.100\n2024-01-15 WARNING: High memory usage detected\n2024-01-15 CRITICAL: Payment service crashed, API key: sk_live_abc123xyz456\n2024-01-15 WARNING: Deprecated function called\n2024-01-15 ERROR: Authentication failed for user jane.smith@company.com"
  }'
```

### Example 2: Simple Log Analysis

```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze these logs for errors",
    "data": "INFO: Application started\nERROR: Connection timeout\nWARNING: Low disk space"
  }'
```

### Example 3: Sanitization Only

```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Sanitize this sensitive data",
    "data": "Contact: john@example.com, Phone: 555-123-4567, IP: 10.0.0.1"
  }'
```

## 📊 Expected Output

When running Example 1, you'll see orchestrated execution:

```
=== Project Chimera Results ===

📋 Execution Plan:
[
  { "agent": "log-analyzer", "task": "analyze", "inputFrom": "user" },
  { "agent": "report-generator", "task": "generate", "dependsOn": "log-analyzer" }
]

🔄 Execution Trace:
Step 1: log-analyzer
  ↳ Called sanitizer agent (agent-to-agent) ✓
  ↳ Sanitizer removed: 2 emails, 1 IP address, 1 API key
  ↳ Analysis complete: 2 errors, 2 warnings, 1 critical

Step 2: report-generator
  ↳ Dependency met: log-analyzer
  ↳ Generated executive summary
  ↳ Created visualization

📊 Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agent: log-analyzer
  → Called sanitizer internally ✓
  → Found: 1 critical, 2 errors, 2 warnings
  
Agent: report-generator
  → Health Score: 65%
  → Status: 🟡 Needs Attention
  → Visual Asset: [ASCII Chart]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔑 Key Features

### 1. Self-Registration
Agents automatically register with the orchestrator on startup, declaring their capabilities:

```typescript
// Each agent calls this on startup
POST /register
{
  "name": "sanitizer",
  "url": "http://localhost:5001",
  "tools": [
    {
      "name": "sanitize",
      "description": "Removes PII and sensitive information",
      "input": "{ data: string }"
    }
  ]
}
```

### 2. Intelligent Planning
The orchestrator uses keyword-based planning to determine execution flow:

- Keywords like "sanitize", "sensitive" → involves Sanitizer
- Keywords like "logs", "analyze", "errors" → involves Log Analyzer
- Keywords like "report", "summary", "visual" → involves Report Generator

### 3. Agent-to-Agent Communication ⚡
**Critical Requirement Met:** The Log Analyzer agent directly calls the Sanitizer agent:

```typescript
// Inside log-analyzer/src/index.ts
const sanitizeResponse = await axios.post(
  'http://localhost:5001/sanitize',
  { data: logs }
);
```

This is NOT orchestrator-mediated - it's a direct HTTP call between agents!

### 4. Dependency Management
The orchestrator ensures agents execute in the correct order based on dependencies:

```typescript
{
  "agent": "report-generator",
  "dependsOn": "log-analyzer",  // Waits for log-analyzer to complete
  "inputFrom": "log-analyzer"   // Uses its output as input
}
```

## 📁 Project Structure

```
project-chimera/
├── orchestrator/              # MCP Orchestrator
│   ├── src/
│   │   ├── index.ts          # Main server
│   │   ├── registry.ts       # Agent registry (Map)
│   │   ├── planner.ts        # Rule-based planner
│   │   ├── executor.ts       # Plan execution engine
│   │   └── types.ts          # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
│
├── agents/
│   ├── sanitizer/            # Data Sanitizer Agent
│   │   └── src/index.ts
│   ├── log-analyzer/         # Log Analyzer Agent
│   │   └── src/index.ts      # ⚡ Calls sanitizer directly
│   └── report-generator/     # Report Generator Agent
│       └── src/index.ts
│
├── README.md                 # This file
├── DESIGN.md                 # Architecture details
└── package.json              # Root package with scripts
```

## 🛠️ Development

### Individual Agent Development

```bash
# Orchestrator
cd orchestrator
npm install
npm run dev

# Any agent
cd agents/sanitizer
npm install
npm run dev
```

### Environment Variables

```bash
# Orchestrator
PORT=5000

# Agents
PORT=5001  # sanitizer
PORT=5002  # log-analyzer
PORT=5003  # report-generator
ORCHESTRATOR_URL=http://localhost:5000
SANITIZER_URL=http://localhost:5001  # for log-analyzer
```

## 🧪 Testing Individual Agents

### Test Sanitizer
```bash
curl -X POST http://localhost:5001/sanitize \
  -H "Content-Type: application/json" \
  -d '{"data": "Email: test@example.com, IP: 192.168.1.1"}'
```

### Test Log Analyzer
```bash
curl -X POST http://localhost:5002/analyze \
  -H "Content-Type: application/json" \
  -d '{"data": "ERROR: Connection failed\nWARNING: Timeout"}'
```

### Test Report Generator
```bash
curl -X POST http://localhost:5003/generate-report \
  -H "Content-Type: application/json" \
  -d '{"data": {"analysis": {"critical": 1, "errors": 2, "warnings": 3}}}'
```

## 📈 Scaling Considerations

See [DESIGN.md](./DESIGN.md) for detailed discussion on:
- Horizontal scaling strategies
- Real LLM integration
- Production considerations
- Security and reliability

## 🎓 Assignment Context

This project was built as a take-home assignment demonstrating:
- Multi-agent orchestration
- MCP-inspired architecture
- Agent autonomy and self-organization
- Inter-agent communication
- TypeScript/Node.js proficiency

**Time Investment:** ~3 hours  
**Focus:** Working logic, clarity, and creative thinking over production-grade code

## 📝 License

MIT


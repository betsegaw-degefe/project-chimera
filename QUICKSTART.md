# Project Chimera - Quick Start Guide ⚡

Get Project Chimera up and running in 5 minutes!

## 🚀 Step-by-Step Setup

### 1. Install Dependencies (2 minutes)

```bash
npm run install:all
```

This will install dependencies for:
- Root project
- Orchestrator
- All 3 agents (sanitizer, log-analyzer, report-generator)

### 2. Build TypeScript (1 minute)

```bash
npm run build:all
```

This compiles all TypeScript code to JavaScript.

### 3. Start All Services (4 terminals needed)

Open 4 separate terminal windows/tabs and run these commands:

**Terminal 1 - Orchestrator:**
```bash
npm run start:orchestrator
```
Wait for: `🎭 PROJECT CHIMERA - MCP ORCHESTRATOR`

**Terminal 2 - Sanitizer Agent:**
```bash
npm run start:sanitizer
```
Wait for: `✅ Successfully registered with orchestrator`

**Terminal 3 - Log Analyzer Agent:**
```bash
npm run start:log-analyzer
```
Wait for: `✅ Successfully registered with orchestrator`

**Terminal 4 - Report Generator Agent:**
```bash
npm run start:report-generator
```
Wait for: `✅ Successfully registered with orchestrator`

### 4. Verify All Agents Are Registered

In a 5th terminal, run:

```bash
curl http://localhost:5000/agents
```

You should see 3 registered agents:
- sanitizer
- log-analyzer
- report-generator

### 5. Run Test Request

**Option A: Using provided test script (Linux/Mac)**
```bash
chmod +x test-request.sh
./test-request.sh
```

**Option B: Using PowerShell (Windows)**
```powershell
.\test-request.ps1
```

**Option C: Using curl directly**
```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Analyze system logs for errors, sanitize sensitive data, and generate a report with visual",
    "data": "2024-01-15 ERROR: Database connection failed for user john.doe@company.com from IP 192.168.1.100\n2024-01-15 WARNING: High memory usage\n2024-01-15 CRITICAL: Payment service crashed"
  }'
```

## ✅ What You Should See

1. **Orchestrator Console:**
   - Receives request
   - Generates execution plan
   - Executes plan step by step
   - Returns aggregated results

2. **Sanitizer Console:**
   - Receives call from Log Analyzer (agent-to-agent!)
   - Sanitizes sensitive data
   - Returns cleaned logs

3. **Log Analyzer Console:**
   - Calls Sanitizer directly ⚡
   - Analyzes sanitized logs
   - Returns findings

4. **Report Generator Console:**
   - Receives analysis results
   - Generates executive summary
   - Creates ASCII chart

5. **API Response:**
   - Execution plan
   - Results from all agents
   - Visual asset (ASCII chart)
   - Health score and recommendations

## 🎯 Key Features to Notice

### 1. Self-Registration
Watch the agent consoles - they automatically register with the orchestrator on startup.

### 2. Agent-to-Agent Communication ⚡
**This is the critical requirement!**

Look at the Log Analyzer console:
```
🔗 Calling Sanitizer agent at http://localhost:5001/sanitize
  ✓ Sanitization complete: 4 items removed
```

This is a DIRECT call between agents, not orchestrator-mediated!

### 3. Intelligent Planning
The orchestrator analyzes your natural language request and decides which agents to use:
```json
{
  "plan": [
    { "agent": "log-analyzer", "task": "analyze" },
    { "agent": "report-generator", "task": "generate", "dependsOn": "log-analyzer" }
  ]
}
```

### 4. Dependency Management
Report Generator waits for Log Analyzer to complete, then uses its output.

## 🧪 Try Different Requests

### Just Log Analysis
```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{"request": "Analyze these logs", "data": "ERROR: Connection failed\nWARNING: Timeout"}'
```

### Just Sanitization
```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{"request": "Sanitize sensitive data", "data": "Contact: john@test.com, IP: 192.168.1.1"}'
```

### Full Intelligence Brief
```bash
curl -X POST http://localhost:5000/plan-and-run \
  -H "Content-Type: application/json" \
  -d '{"request": "Create intelligence brief from logs with visual", "data": "ERROR: System failure\nCRITICAL: Data breach"}'
```

## 🔧 Troubleshooting

### Agents Not Registering
**Problem:** Agents say "Failed to register with orchestrator"

**Solution:**
1. Make sure orchestrator is running first
2. Wait 2-3 seconds before starting agents
3. Check orchestrator is on port 5000: `curl http://localhost:5000/health`

### Port Already in Use
**Problem:** `EADDRINUSE: address already in use`

**Solution:**
Kill processes on the ports:

```bash
# Linux/Mac
lsof -ti:5000 | xargs kill
lsof -ti:5001 | xargs kill
lsof -ti:5002 | xargs kill
lsof -ti:5003 | xargs kill

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process
```

### TypeScript Compilation Errors
**Problem:** Build fails with TypeScript errors

**Solution:**
```bash
# Clean and rebuild
rm -rf */dist */node_modules
npm run install:all
npm run build:all
```

### Agent Can't Call Another Agent
**Problem:** Log Analyzer can't reach Sanitizer

**Solution:**
1. Verify Sanitizer is running: `curl http://localhost:5001/health`
2. Check the SANITIZER_URL in log-analyzer console output
3. Make sure no firewall is blocking localhost connections

## 📊 Understanding the Output

The API returns JSON with:

```javascript
{
  "request": "...",           // Your original request
  "plan": [...],              // Execution plan generated
  "success": true,            // Overall success status
  "results": {                // Results from each agent
    "log-analyzer": {...},
    "report-generator": {...}
  },
  "executionTrace": [...]     // Summary of execution
}
```

## 🎓 Assignment Requirements Checklist

✅ **MCP Orchestrator**
- [x] Connects to 3+ agents
- [x] Planning phase
- [x] Agent self-registration via /register
- [x] Aggregates and displays results
- [x] CLI/API endpoint (/plan-and-run)

✅ **3+ Agent Servers**
- [x] Sanitizer (data processing)
- [x] Log Analyzer (log analysis)
- [x] Report Generator (text/media handling)
- [x] Each offers tool-like functions
- [x] Self-register on startup

✅ **Agent-to-Agent Communication**
- [x] Log Analyzer calls Sanitizer DIRECTLY
- [x] Not orchestrator-mediated

✅ **Orchestration Flow**
- [x] Natural language request
- [x] Planner determines agents
- [x] Dependency management
- [x] Combined output

✅ **Documentation**
- [x] Architecture diagram (DESIGN.md)
- [x] Orchestration flow description (DESIGN.md)
- [x] Scaling notes (DESIGN.md)
- [x] README with setup instructions
- [x] Example output

## 🎉 Next Steps

1. Review the code in `/orchestrator/src/` and `/agents/*/src/`
2. Read `DESIGN.md` for detailed architecture explanation
3. Experiment with different natural language requests
4. Modify agent behaviors to add new capabilities

## 📚 Key Files to Review

- `orchestrator/src/planner.ts` - Rule-based planning logic
- `orchestrator/src/executor.ts` - Execution engine
- `agents/log-analyzer/src/index.ts` - Agent-to-agent call implementation
- `DESIGN.md` - Complete architecture documentation

Enjoy exploring Project Chimera! 🧬


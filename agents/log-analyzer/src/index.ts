import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5002;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:5000';
const SANITIZER_URL = process.env.SANITIZER_URL || 'http://localhost:5001';
const AGENT_NAME = 'log-analyzer';
const AGENT_URL = `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Log patterns for analysis
const ERROR_PATTERNS = {
  critical: /\b(fatal|critical|panic|crash|emergency)\b/gi,
  error: /\b(error|failed|failure|exception)\b/gi,
  warning: /\b(warning|warn|deprecated|caution)\b/gi,
  info: /\b(info|notice|debug)\b/gi
};

interface AnalyzeRequest {
  data: string;
}

/**
 * POST /analyze
 * Analyzes logs for errors and warnings
 * IMPORTANT: This agent calls the Sanitizer agent directly!
 */
app.post('/analyze', async (req: Request<{}, {}, AnalyzeRequest>, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing required field: data' });
    }

    console.log(`📊 Analyzing logs (${data.length} characters)`);

    // ⚡ AGENT-TO-AGENT CALL: Call Sanitizer directly!
    console.log(`🔗 Calling Sanitizer agent at ${SANITIZER_URL}/sanitize`);
    
    let sanitizedData = data;
    let sanitizationInfo = null;

    try {
      const sanitizeResponse = await axios.post(`${SANITIZER_URL}/sanitize`, 
        { data },
        { timeout: 5000 }
      );
      
      sanitizedData = sanitizeResponse.data.sanitized;
      sanitizationInfo = {
        count: sanitizeResponse.data.count,
        message: sanitizeResponse.data.message
      };
      
      console.log(`  ✓ Sanitization complete: ${sanitizeResponse.data.count} items removed`);
    } catch (error: any) {
      console.warn(`  ⚠ Sanitizer unavailable, analyzing raw logs: ${error.message}`);
    }

    // Analyze the sanitized logs
    console.log(`  🔍 Analyzing for patterns...`);
    
    const lines = sanitizedData.split('\n');
    const findings: any = {
      critical: [],
      errors: [],
      warnings: [],
      info: []
    };

    let criticalCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    lines.forEach((line, index) => {
      if (ERROR_PATTERNS.critical.test(line)) {
        criticalCount++;
        findings.critical.push({ line: index + 1, text: line.substring(0, 100) });
      } else if (ERROR_PATTERNS.error.test(line)) {
        errorCount++;
        findings.errors.push({ line: index + 1, text: line.substring(0, 100) });
      } else if (ERROR_PATTERNS.warning.test(line)) {
        warningCount++;
        findings.warnings.push({ line: index + 1, text: line.substring(0, 100) });
      } else if (ERROR_PATTERNS.info.test(line)) {
        infoCount++;
      }
    });

    console.log(`  ✓ Analysis complete:`);
    console.log(`    - Critical: ${criticalCount}`);
    console.log(`    - Errors: ${errorCount}`);
    console.log(`    - Warnings: ${warningCount}`);
    console.log(`    - Info: ${infoCount}\n`);

    res.json({
      success: true,
      analysis: {
        totalLines: lines.length,
        critical: criticalCount,
        errors: errorCount,
        warnings: warningCount,
        info: infoCount,
        findings: {
          critical: findings.critical.slice(0, 5),
          errors: findings.errors.slice(0, 5),
          warnings: findings.warnings.slice(0, 5)
        }
      },
      sanitization: sanitizationInfo,
      agentToAgentCall: {
        called: 'sanitizer',
        url: SANITIZER_URL,
        success: sanitizationInfo !== null
      },
      summary: `Analyzed ${lines.length} log lines: ${criticalCount} critical, ${errorCount} errors, ${warningCount} warnings`,
      message: 'Log analysis complete with sanitization'
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /info
 * Returns agent information
 */
app.get('/info', (_req: Request, res: Response) => {
  res.json({
    name: AGENT_NAME,
    url: AGENT_URL,
    tools: [
      {
        name: 'analyze',
        description: 'Analyzes system logs for errors, warnings, and critical issues. Calls sanitizer agent internally.',
        input: '{ data: string }'
      }
    ]
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', agent: AGENT_NAME });
});

/**
 * Auto-register with orchestrator on startup
 */
async function registerWithOrchestrator() {
  try {
    console.log(`📡 Attempting to register with orchestrator at ${ORCHESTRATOR_URL}...`);
    
    const response = await axios.post(`${ORCHESTRATOR_URL}/register`, {
      name: AGENT_NAME,
      url: AGENT_URL,
      tools: [
        {
          name: 'analyze',
          description: 'Analyzes system logs for errors, warnings, and critical issues. Calls sanitizer agent internally.',
          input: '{ data: string }'
        }
      ]
    }, {
      timeout: 5000
    });

    console.log(`✅ Successfully registered with orchestrator`);
    console.log(`   Response:`, response.data.message);
  } catch (error: any) {
    console.error(`❌ Failed to register with orchestrator:`, error.message);
    console.error(`   Make sure orchestrator is running at ${ORCHESTRATOR_URL}`);
  }
}

// Start server
app.listen(PORT, () => {
  console.log('\n' + '━'.repeat(60));
  console.log('📊 LOG ANALYZER AGENT');
  console.log('━'.repeat(60));
  console.log(`🚀 Running on ${AGENT_URL}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /analyze   - Analyze logs (calls sanitizer internally)`);
  console.log(`   GET  /info      - Agent information`);
  console.log(`   GET  /health    - Health check`);
  console.log('━'.repeat(60));
  console.log(`🔗 Will call Sanitizer at: ${SANITIZER_URL}`);
  console.log('━'.repeat(60) + '\n');

  // Register with orchestrator after a short delay
  setTimeout(registerWithOrchestrator, 2000);
});


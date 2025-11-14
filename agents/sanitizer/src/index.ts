import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5001;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:5000';
const AGENT_NAME = 'sanitizer';
const AGENT_URL = `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// Sanitization patterns
const PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  phone: /\b\d{3}-\d{3}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  apiKey: /(sk_live_|pk_live_|sk_test_|pk_test_|api[_-]?key[:\s]+)[a-zA-Z0-9_-]+|[a-zA-Z0-9]{32,}/gi
};

interface SanitizeRequest {
  data: string;
}

/**
 * POST /sanitize
 * Removes PII and sensitive information from text
 */
app.post('/sanitize', (req: Request<{}, {}, SanitizeRequest>, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing required field: data' });
    }

    console.log(`🔒 Sanitizing data (${data.length} characters)`);

    let sanitized = data;
    const removed: string[] = [];
    let totalCount = 0;

    // Apply each pattern
    for (const [type, pattern] of Object.entries(PATTERNS)) {
      const matches = sanitized.match(pattern);
      if (matches && matches.length > 0) {
        removed.push(...matches.map(m => `${type}: ${m.substring(0, 10)}...`));
        sanitized = sanitized.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
        totalCount += matches.length;
        console.log(`  - Removed ${matches.length} ${type}(s)`);
      }
    }

    console.log(`  ✓ Sanitization complete: ${totalCount} items removed\n`);

    res.json({
      success: true,
      sanitized,
      removed: removed.slice(0, 10), // limit output
      count: totalCount,
      message: `Sanitized ${totalCount} sensitive items`
    });

  } catch (error: any) {
    console.error('Sanitization error:', error);
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
        name: 'sanitize',
        description: 'Removes PII and sensitive information from text (emails, IPs, SSNs, phone numbers, etc.)',
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
          name: 'sanitize',
          description: 'Removes PII and sensitive information from text (emails, IPs, SSNs, phone numbers, etc.)',
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
  console.log('🔒 SANITIZER AGENT');
  console.log('━'.repeat(60));
  console.log(`🚀 Running on ${AGENT_URL}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /sanitize  - Sanitize sensitive data`);
  console.log(`   GET  /info      - Agent information`);
  console.log(`   GET  /health    - Health check`);
  console.log('━'.repeat(60) + '\n');

  // Register with orchestrator after a short delay
  setTimeout(registerWithOrchestrator, 2000);
});


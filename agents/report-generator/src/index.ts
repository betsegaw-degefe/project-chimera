import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5003;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:5000';
const AGENT_NAME = 'report-generator';
const AGENT_URL = `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

interface GenerateReportRequest {
  data: any;
}

/**
 * Creates an ASCII bar chart
 */
function createChart(data: any): string {
  const chart: string[] = [];
  chart.push('\n📊 Visual Asset - System Health Chart');
  chart.push('━'.repeat(50));

  if (data.analysis) {
    const { critical, errors, warnings, info } = data.analysis;
    const maxValue = Math.max(critical || 0, errors || 0, warnings || 0, info || 0, 1);
    const scale = 30;

    const createBar = (label: string, value: number, symbol: string) => {
      const barLength = Math.ceil((value / maxValue) * scale);
      const bar = symbol.repeat(barLength);
      const spaces = ' '.repeat(Math.max(0, scale - barLength));
      return `${label.padEnd(12)} ${bar}${spaces} (${value})`;
    };

    if (critical > 0) chart.push(createBar('Critical:', critical, '█'));
    if (errors > 0) chart.push(createBar('Errors:', errors, '▓'));
    if (warnings > 0) chart.push(createBar('Warnings:', warnings, '▒'));
    if (info > 0) chart.push(createBar('Info:', info, '░'));
  } else {
    chart.push('No analysis data available');
  }

  chart.push('━'.repeat(50));
  return chart.join('\n');
}

/**
 * POST /generate-report
 * Generates executive summary and visual assets from analysis data
 */
app.post('/generate-report', (req: Request<{}, {}, GenerateReportRequest>, res: Response) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing required field: data' });
    }

    console.log(`📝 Generating report from analysis data`);

    // Extract analysis info
    const analysis = data.analysis || {};
    const sanitization = data.sanitization || {};
    const { critical = 0, errors = 0, warnings = 0, totalLines = 0 } = analysis;

    // Calculate health score
    const totalIssues = critical * 3 + errors * 2 + warnings;
    const healthScore = Math.max(0, 100 - totalIssues * 5);

    // Generate executive summary
    const summary = {
      title: '🎯 Project Intelligence Brief',
      timestamp: new Date().toISOString(),
      overview: `System analysis completed for ${totalLines} log entries.`,
      findings: {
        critical: critical,
        errors: errors,
        warnings: warnings,
        total: critical + errors + warnings
      },
      sanitization: sanitization.message || 'Data sanitization not performed',
      healthScore: healthScore,
      status: healthScore > 80 ? '🟢 Healthy' : healthScore > 50 ? '🟡 Needs Attention' : '🔴 Critical',
      recommendations: [] as string[]
    };

    // Add recommendations
    if (critical > 0) {
      summary.recommendations.push('⚠️  URGENT: Address critical issues immediately');
    }
    if (errors > 5) {
      summary.recommendations.push('📌 High error count detected - investigate root causes');
    }
    if (warnings > 10) {
      summary.recommendations.push('⚡ Consider addressing warnings to prevent future issues');
    }
    if (summary.recommendations.length === 0) {
      summary.recommendations.push('✅ System operating within normal parameters');
    }

    // Create visual asset
    const chart = createChart(data);

    console.log(`  ✓ Report generated: Health Score ${healthScore}%`);
    console.log(`  ✓ Visual asset created\n`);

    res.json({
      success: true,
      report: summary,
      visualAsset: chart,
      summary: `Generated intelligence brief: ${summary.findings.total} issues found, health score ${healthScore}%`,
      message: 'Executive report and visual asset generated successfully'
    });

  } catch (error: any) {
    console.error('Report generation error:', error);
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
        name: 'generate-report',
        description: 'Generates executive summary and visual assets from analysis data',
        input: '{ data: any }'
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
          name: 'generate-report',
          description: 'Generates executive summary and visual assets from analysis data',
          input: '{ data: any }'
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
  console.log('📝 REPORT GENERATOR AGENT');
  console.log('━'.repeat(60));
  console.log(`🚀 Running on ${AGENT_URL}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /generate-report  - Generate intelligence brief`);
  console.log(`   GET  /info             - Agent information`);
  console.log(`   GET  /health           - Health check`);
  console.log('━'.repeat(60) + '\n');

  // Register with orchestrator after a short delay
  setTimeout(registerWithOrchestrator, 2000);
});


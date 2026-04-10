#!/usr/bin/env tsx
/**
 * Analyze execution logs to identify patterns
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const LOGS_DIR = join(process.cwd(), '.harness', '.local', 'logs');

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  task?: string;
  error?: string;
}

interface AnalysisResult {
  totalTasks: number;
  successCount: number;
  failureCount: number;
  failurePatterns: Array<{
    pattern: string;
    count: number;
    examples: string[];
  }>;
  slowOperations: Array<{
    operation: string;
    avgDuration: number;
    maxDuration: number;
  }>;
}

async function analyzeLogs(options: {
  days?: number;
  taskType?: string;
}): Promise<AnalysisResult> {
  const { days = 7, taskType } = options;
  
  // Read log files
  const logFiles = readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.log'))
    .slice(-days);
  
  const entries: LogEntry[] = [];
  
  for (const file of logFiles) {
    const content = readFileSync(join(LOGS_DIR, file), 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (!taskType || entry.task === taskType) {
          entries.push(entry);
        }
      } catch {
        // Skip invalid lines
      }
    }
  }
  
  // Analyze patterns
  const failures = entries.filter(e => e.level === 'ERROR');
  const successCount = entries.filter(e => e.level === 'INFO' && e.message.includes('completed')).length;
  
  // Group failures by pattern
  const patterns = new Map<string, { count: number; examples: string[] }>();
  
  for (const failure of failures) {
    const errorMsg = failure.error || failure.message;
    const pattern = extractPattern(errorMsg);
    
    if (!patterns.has(pattern)) {
      patterns.set(pattern, { count: 0, examples: [] });
    }
    
    const p = patterns.get(pattern)!;
    p.count++;
    if (p.examples.length < 3) {
      p.examples.push(errorMsg);
    }
  }
  
  return {
    totalTasks: entries.length,
    successCount,
    failureCount: failures.length,
    failurePatterns: Array.from(patterns.entries())
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count),
    slowOperations: [], // TODO: implement duration tracking
  };
}

function extractPattern(errorMessage: string): string {
  // Extract common error patterns
  if (errorMessage.includes('timeout')) return 'timeout';
  if (errorMessage.includes('network')) return 'network_error';
  if (errorMessage.includes('ffmpeg')) return 'ffmpeg_failed';
  if (errorMessage.includes('ENOSPC')) return 'disk_full';
  if (errorMessage.includes('ECONNREFUSED')) return 'connection_refused';
  return 'other';
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const taskArg = args.find(a => a.startsWith('--task='));
  const daysArg = args.find(a => a.startsWith('--days='));
  
  const options = {
    taskType: taskArg?.split('=')[1],
    days: daysArg ? parseInt(daysArg.split('=')[1]) : 7,
  };
  
  analyzeLogs(options).then(result => {
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 Execution Analysis');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total Tasks: ${result.totalTasks}`);
    console.log(`✅ Success: ${result.successCount}`);
    console.log(`❌ Failures: ${result.failureCount}`);
    console.log(`📈 Success Rate: ${((result.successCount / result.totalTasks) * 100).toFixed(1)}%`);
    
    if (result.failurePatterns.length > 0) {
      console.log('\n📋 Top Failure Patterns:');
      result.failurePatterns.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.pattern}: ${p.count} occurrences`);
        p.examples.forEach(e => console.log(`     - ${e.substring(0, 80)}`));
      });
    }
  });
}

export { analyzeLogs };

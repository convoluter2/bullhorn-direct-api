import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🔄 Proxy Restart Helper');
console.log('📁 Project root:', projectRoot);

try {
  const pidDir = `${projectRoot}/pids`;
  if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
  }

  const child = spawn('bash', ['restart-proxy.sh'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  console.log('✅ Restart process initiated');
  console.log('🆔 Child PID:', child.pid);

  writeFileSync(`${pidDir}/restart.pid`, String(child.pid));
  
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to restart proxy:', error);
  process.exit(1);
}

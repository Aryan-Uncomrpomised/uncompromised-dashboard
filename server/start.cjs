const { spawn } = require('child_process');

console.log('Starting API Server (SQLite backed)...');
spawn('node', ['index.cjs'], { stdio: 'inherit' });

console.log('Starting Background Sync Worker (Runs every 5 minutes)...');

const runSync = () => {
  const syncProcess = spawn('node', ['sync.cjs'], { stdio: 'inherit' });
  syncProcess.on('close', (code) => {
    console.log(`[Sync Worker] Process exited with code ${code}. Next sync in 5 minutes...`);
  });
};

// Run first sync immediately
runSync();

// Schedule subsequent syncs every 5 minutes
setInterval(runSync, 5 * 60 * 1000);

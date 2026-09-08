import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

// Port environments for virtual apps
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Host the statically compiled EchoLogic HTML frontend
app.use(express.static(path.join(__dirname, 'frontend/out')));

// Handle raw microphone socket channels seamlessly from virtual environments
wss.on('connection', (ws) => {
  console.log('🎙️ Secured voice instance connected successfully.');

  ws.on('message', (audioBuffer) => {
    if (Buffer.isBuffer(audioBuffer)) {
      // PRO-TIP: This feeds raw 16kHz PCM audio arrays directly to your agents pipeline
      // Insert your custom pipeline execution hook from your lib.mjs here
    }
  });

  ws.on('close', () => {
    console.log('🔇 Voice stream disconnected safely.');
  });
});

// Intercept standard connections and upgrade them securely to persistent real-time pipelines
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Single port operation required by production platforms
server.listen(PORT, () => {
  console.log(`🚀 Unified Hackathon Platform alive on secure port: ${PORT}`);
});

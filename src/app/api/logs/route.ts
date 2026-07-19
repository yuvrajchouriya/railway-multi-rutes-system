// ============================================================
// LIVE LOGS API — Server-Sent Events (SSE)
// Streams real server logs to the browser in real-time
// ============================================================

import { NextRequest } from 'next/server';

// Global log buffer shared with route-finder & railway-client
export const logBuffer: string[] = [];
export function pushLog(msg: string) {
  const time = new Date().toTimeString().slice(0, 8);
  logBuffer.push(`[${time}] ${msg}`);
  if (logBuffer.length > 200) logBuffer.shift();
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send existing logs first
      for (const log of logBuffer) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      }

      // Poll for new logs every 500ms
      let lastSent = logBuffer.length;
      const interval = setInterval(() => {
        if (logBuffer.length > lastSent) {
          const newLogs = logBuffer.slice(lastSent);
          for (const log of newLogs) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
          }
          lastSent = logBuffer.length;
        }
      }, 300);

      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

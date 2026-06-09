import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { connectSystemctlTranscription } from "./lib/transcription/systemctlAdapter";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const wss = new WebSocketServer({ noServer: true });

async function startServer() {
  await app.prepare();

  const server = createServer((request, response) => handle(request, response));
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || hostname}`);
    if (url.pathname !== "/api/realtime-transcription") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (client) => {
      connectSystemctlTranscription(client, request);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`MinuteDock: http://${hostname}:${port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

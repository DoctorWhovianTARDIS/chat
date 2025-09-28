// server/server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let users = {}; // { wsId: {username, display} }
let groups = {}; // { groupId: {name, members:Set, messages:[]} }

function broadcast(groupId, data) {
  if (!groups[groupId]) return;
  groups[groupId].members.forEach((userId) => {
    const client = users[userId]?.ws;
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  users[id] = { ws, username: "anon-" + id, display: "Anon" };

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "auth") {
        users[id].username = data.username;
        users[id].display = data.display || data.username;
      }
      if (data.type === "createGroup") {
        const gid = "g_" + Date.now().toString(36);
        groups[gid] = {
          name: data.name,
          members: new Set([id]),
          messages: [],
        };
        ws.send(JSON.stringify({ type: "groupCreated", groupId: gid, name: data.name }));
      }
      if (data.type === "joinGroup") {
        const g = groups[data.groupId];
        if (g) g.members.add(id);
        ws.send(JSON.stringify({ type: "joined", groupId: data.groupId }));
      }
      if (data.type === "message") {
        const g = groups[data.groupId];
        if (!g) return;
        const msgObj = {
          user: users[id].username,
          display: users[id].display,
          text: data.text,
          ts: Date.now(),
        };
        g.messages.push(msgObj);
        broadcast(data.groupId, { type: "message", groupId: data.groupId, ...msgObj });
      }
    } catch (e) {
      console.error("Bad message:", e);
    }
  });

  ws.on("close", () => {
    delete users[id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("WebSocket server running on port " + PORT));

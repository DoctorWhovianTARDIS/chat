// Replace with your deployed Render backend URL:
const ws = new WebSocket("wss://YOUR-RENDER-BACKEND.onrender.com");

let currentGroup = null;
let username = "";
let display = "";

const $ = id => document.getElementById(id);

ws.addEventListener("open", () => {
  console.log("✅ Connected to Render backend");
});

ws.addEventListener("message", e => {
  const data = JSON.parse(e.data);

  if (data.type === "groupCreated") {
    addGroup(data.groupId, data.name);
  }

  if (data.type === "joined") {
    currentGroup = data.groupId;
    $("currentGroupTitle").textContent = "Group: " + currentGroup;
  }

  if (data.type === "message") {
    renderMessage(data);
  }
});

function addGroup(id, name) {
  const div = document.createElement("div");
  div.className = "group-item";
  div.textContent = name;
  div.onclick = () => {
    ws.send(JSON.stringify({ type: "joinGroup", groupId: id }));
    currentGroup = id;
  };
  $("groupList").appendChild(div);
}

function renderMessage(m) {
  const list = $("msgList");
  const d = document.createElement("div");
  d.className = "msg" + (m.user === username ? " me" : "");
  d.innerHTML = `<div class="meta">${m.display} • ${new Date(m.ts).toLocaleTimeString()}</div><div>${m.text}</div>`;
  list.appendChild(d);
  list.scrollTop = list.scrollHeight;
}

// UI handlers
$("loginBtn").onclick = () => {
  username = $("username").value.trim() || "guest";
  display = $("display").value.trim() || username;

  ws.send(JSON.stringify({ type: "auth", username, display }));

  $("authView").style.display = "none";
  $("mainApp").style.display = "flex";
  $("meUser").textContent = username;
  $("profileUser").textContent = username;
  $("profileDisplay").textContent = display;
};

$("createGroupBtn").onclick = () => {
  const name = $("newGroupName").value.trim();
  if (!name) return;
  ws.send(JSON.stringify({ type: "createGroup", name }));
  $("newGroupName").value = "";
};

$("sendBtn").onclick = () => {
  const text = $("msgInput").value.trim();
  if (!text || !currentGroup) return;
  ws.send(JSON.stringify({ type: "message", groupId: currentGroup, text }));
  $("msgInput").value = "";
};

$("logoutBtn").onclick = () => location.reload();

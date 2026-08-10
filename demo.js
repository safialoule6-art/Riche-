/* Sunami — démo interactive jouable SANS compte (landing) */
(function () {
  const MAX_TURNS = 3;         // nb de réponses avant le mur d'inscription
  const START_CAP = 3;         // nb de démos max par navigateur / jour (anti-abus)
  const LEVEL = "A1-A2 (débutant)";
  const THEME = "voyage";

  const el = (id) => document.getElementById(id);
  const chooseBox = el("dlChoose");
  const chatWrap = el("dlChatWrap");
  const chat = el("dlChat");
  const input = el("dlInput");
  const sendBtn = el("dlSend");
  const wall = el("dlWall");
  const inputBar = el("dlInputBar");
  if (!chooseBox || !chat) return; // section absente → on ne fait rien

  let history = [];
  let turns = 0;
  let busy = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmt(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  }
  function scrollDown() { chat.scrollTop = chat.scrollHeight; }

  function addAI(text) {
    const d = document.createElement("div");
    d.className = "dl-msg ai";
    d.innerHTML = '<div class="dl-ava"><svg viewBox="0 0 120 140" width="20" height="24"><use href="#mascot"/></svg></div><div class="dl-bubble">' + fmt(text) + "</div>";
    chat.appendChild(d); scrollDown();
  }
  function addUser(text) {
    const d = document.createElement("div");
    d.className = "dl-msg user";
    d.innerHTML = '<div class="dl-bubble">' + esc(text) + "</div>";
    chat.appendChild(d); scrollDown();
  }
  function addTyping() {
    const d = document.createElement("div");
    d.className = "dl-msg ai dl-typing";
    d.innerHTML = '<div class="dl-ava"><svg viewBox="0 0 120 140" width="20" height="24"><use href="#mascot"/></svg></div><div class="dl-bubble">…</div>';
    chat.appendChild(d); scrollDown(); return d;
  }

  function dayKey() { return "sunami_demo_" + new Date().toISOString().slice(0, 10); }
  function startsToday() { return parseInt(localStorage.getItem(dayKey()) || "0", 10) || 0; }
  function bumpStarts() { localStorage.setItem(dayKey(), String(startsToday() + 1)); }

  async function callAI(userReply) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, userReply: userReply || "", language: currentLang, level: LEVEL, theme: THEME }),
    });
    if (res.status === 429) throw new Error("rate_limit");
    if (!res.ok) throw new Error("http_" + res.status);
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d.text || "";
  }

  let currentLang = null;

  async function start(lang) {
    if (busy) return;
    if (startsToday() >= START_CAP) {
      chooseBox.style.display = "none";
      chatWrap.style.display = "block";
      inputBar.style.display = "none";
      addAI("Tu as déjà bien exploré la démo aujourd'hui 🙂 Crée un compte gratuit pour continuer sans limite.");
      wall.style.display = "block";
      return;
    }
    currentLang = lang;
    history = []; turns = 0;
    chooseBox.style.display = "none";
    chatWrap.style.display = "block";
    wall.style.display = "none";
    inputBar.style.display = "flex";
    bumpStarts();
    const typing = addTyping();
    busy = true;
    try {
      const text = await callAI("");
      typing.remove();
      addAI(text);
      history.push({ role: "assistant", content: text });
      input.focus();
    } catch (e) {
      typing.remove();
      addAI(e.message === "rate_limit"
        ? "Le conteur est très demandé là 😅 réessaie dans un instant."
        : "Oups, le conteur n'a pas répondu. Réessaie dans un instant.");
    } finally { busy = false; }
  }

  async function reply() {
    if (busy) return;
    const val = (input.value || "").trim();
    if (!val) return;
    addUser(val);
    input.value = "";
    const typing = addTyping();
    busy = true;
    try {
      const text = await callAI(val);
      typing.remove();
      addAI(text);
      history.push({ role: "user", content: val });
      history.push({ role: "assistant", content: text });
      turns++;
      if (turns >= MAX_TURNS) {
        inputBar.style.display = "none";
        wall.style.display = "block";
        scrollDown();
      } else {
        input.focus();
      }
    } catch (e) {
      typing.remove();
      addAI(e.message === "rate_limit"
        ? "Le conteur est très demandé là 😅 réessaie dans un instant."
        : "Oups, le conteur n'a pas répondu. Réessaie.");
    } finally { busy = false; }
  }

  document.querySelectorAll(".dl-lang").forEach((b) => {
    b.addEventListener("click", () => start(b.getAttribute("data-lang")));
  });
  if (sendBtn) sendBtn.addEventListener("click", reply);
  if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") reply(); });
})();

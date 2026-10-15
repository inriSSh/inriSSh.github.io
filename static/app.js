const state = {
  messages: JSON.parse(localStorage.getItem("wb_messages") || "[]"),
  tasks: JSON.parse(localStorage.getItem("wb_tasks") || "[]"),
  lastTranslation: ""
};

const $ = id => document.getElementById(id);
const sourceLang = $("sourceLang"), targetLang = $("targetLang");
const sourceText = $("sourceText"), translatedText = $("translatedText");

const demo = {
  "my|th": {
    "မင်္ဂလာပါ။": "สวัสดีครับ/ค่ะ",
    "မနက်ဖြန် အစည်းအဝေးကို ညနေ ၂ နာရီမှာ လုပ်မယ်။": "พรุ่งนี้เราจะประชุมเวลา 2 โมงเย็น"
  },
  "th|my": {
    "สวัสดีครับ/ค่ะ": "မင်္ဂလာပါ။",
    "พรุ่งนี้เราจะประชุมเวลา 2 โมงเย็น": "မနက်ဖြန် အစည်းအဝေးကို ညနေ ၂ နာရီမှာ လုပ်မယ်။"
  }
};

function saveState() {
  localStorage.setItem("wb_messages", JSON.stringify(state.messages));
  localStorage.setItem("wb_tasks", JSON.stringify(state.tasks));
  updateCounts();
}

function updateLanguageLabels() {
  $("sourceName").textContent = sourceLang.value === "th" ? "Thai" : "Myanmar";
  $("targetName").textContent = targetLang.value === "th" ? "Thai" : "Myanmar";
}

sourceLang.addEventListener("change", updateLanguageLabels);
targetLang.addEventListener("change", updateLanguageLabels);

$("swapLang").onclick = () => {
  const a = sourceLang.value;
  sourceLang.value = targetLang.value;
  targetLang.value = a;
  updateLanguageLabels();
};

async function translateText() {
  const text = sourceText.value.trim();
  if (!text) return;

  translatedText.textContent = "Translating...";
  const key = `${sourceLang.value}|${targetLang.value}`;

  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        text,
        source: sourceLang.value,
        target: targetLang.value
      })
    });

    if (!response.ok) throw new Error("Translation server unavailable");
    const data = await response.json();
    if (!data.translatedText) throw new Error("No translation");
    translatedText.textContent = data.translatedText;
    state.lastTranslation = data.translatedText;
    $("modePill").textContent = "LibreTranslate";
    $("modePill").style.color = "#167a47";
  } catch (e) {
    const fallback = demo[key]?.[text];
    translatedText.textContent = fallback || "Demo mode: translation service is not connected. Type another sentence or connect LibreTranslate.";
    state.lastTranslation = fallback || "";
    $("modePill").textContent = "Demo fallback";
    $("modePill").style.color = "#8b5a00";
  }
}

$("translateBtn").onclick = translateText;

document.querySelectorAll(".quick").forEach(btn => {
  btn.onclick = () => {
    sourceText.value = btn.dataset.text;
    translateText();
  };
});

$("saveBtn").onclick = () => {
  const original = sourceText.value.trim();
  const translated = translatedText.textContent.trim();
  if (!original || !translated || translated === "คำแปลจะแสดงตรงนี้") return;

  state.messages.push({
    id: Date.now(),
    speaker: sourceLang.value === "th" ? "Thai" : "Myanmar",
    original,
    translated,
    time: new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})
  });
  saveState();
  renderConversation();
  sourceText.value = "";
  translatedText.textContent = "คำแปลจะแสดงตรงนี้";
};

$("speakBtn").onclick = () => {
  const text = translatedText.textContent.trim();
  if (!text || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = targetLang.value === "th" ? "th-TH" : "my-MM";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
};

// Browser speech recognition. Support varies by browser/language.
let recognition = null;
let listening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = event => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalText += transcript;
    }
    if (finalText.trim()) {
      sourceText.value = (sourceText.value + " " + finalText).trim();
      translateText();
    }
  };

  recognition.onend = () => {
    if (listening) {
      try { recognition.start(); } catch {}
    }
  };

  recognition.onerror = () => {
    $("modePill").textContent = "Speech recognition unavailable";
  };
} else {
  $("micBtn").disabled = true;
  $("micBtn").textContent = "🎤 Browser speech API unavailable";
}

$("micBtn").onclick = () => {
  if (!recognition) return;
  if (!listening) {
    recognition.lang = sourceLang.value === "th" ? "th-TH" : "my-MM";
    try { recognition.start(); } catch {}
    listening = true;
    $("micBtn").textContent = "■ Stop listening";
    $("wave").classList.add("listening");
    $("modePill").textContent = "Listening...";
  } else {
    listening = false;
    recognition.stop();
    $("micBtn").textContent = "🎤 Start listening";
    $("wave").classList.remove("listening");
    $("modePill").textContent = "Ready";
  }
};

function renderConversation() {
  const box = $("conversationList");
  if (!state.messages.length) {
    box.className = "conversation-list empty";
    box.textContent = "ยังไม่มีบทสนทนา";
    return;
  }
  box.className = "conversation-list";
  box.innerHTML = state.messages.map(m => `
    <div class="message">
      <div class="speaker">${m.speaker === "Thai" ? "TH" : "MM"}</div>
      <div>
        <div class="msg-meta">${m.speaker} · ${m.time}</div>
        <div class="original">${escapeHtml(m.original)}</div>
      </div>
      <div class="translated-box"><b>${m.speaker === "Thai" ? "Myanmar" : "Thai"}</b><br>${escapeHtml(m.translated)}</div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function updateCounts() {
  $("messageCount").textContent = state.messages.length;
  $("historyCount").textContent = `${state.messages.length} messages`;
  $("taskTotal").textContent = state.tasks.length;
  $("taskDone").textContent = state.tasks.filter(t => t.done).length;
  $("taskOpen").textContent = state.tasks.filter(t => !t.done).length;
}

function renderTasks() {
  const box = $("taskList");
  if (!state.tasks.length) {
    box.className = "task-list empty";
    box.textContent = "ยังไม่มีงาน";
    updateCounts();
    return;
  }
  box.className = "task-list";
  box.innerHTML = state.tasks.map((t, i) => `
    <div class="task">
      <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTask(${i})">
      <span style="${t.done ? "text-decoration:line-through;color:#8b94a8" : ""}">${escapeHtml(t.text)}</span>
      <span class="who">${escapeHtml(t.assignee || "Unassigned")}</span>
    </div>
  `).join("");
  updateCounts();
}

window.toggleTask = i => {
  state.tasks[i].done = !state.tasks[i].done;
  saveState();
  renderTasks();
};

$("addTask").onclick = () => {
  const text = prompt("Task description:");
  if (!text?.trim()) return;
  state.tasks.push({text: text.trim(), assignee:"Unassigned", done:false});
  saveState();
  renderTasks();
};

async function generateSummary() {
  if (!state.messages.length) {
    $("summaryText").textContent = "ยังไม่มีบทสนทนาให้สรุป";
    return;
  }
  const response = await fetch("/api/summarize", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({messages:state.messages})
  });
  const data = await response.json();
  $("summaryText").textContent = data.summary;
  if (data.tasks?.length) {
    data.tasks.forEach(t => {
      if (!state.tasks.some(existing => existing.text === t.task)) {
        state.tasks.push({text:t.task, assignee:t.assignee, done:false});
      }
    });
    saveState();
    renderTasks();
  }
  $("summaryTasks").innerHTML = state.tasks.length
    ? state.tasks.map(t => `<li>${escapeHtml(t.text)} — <b>${escapeHtml(t.assignee)}</b></li>`).join("")
    : "<li>ยังไม่มีงานที่ตรวจพบ</li>";
}

$("generateSummary").onclick = generateSummary;
$("goSummary").onclick = () => {
  document.querySelector('[data-page="summary"]').click();
  generateSummary();
};

$("clearConversation").onclick = () => {
  if (!confirm("Clear all conversation?")) return;
  state.messages = [];
  saveState();
  renderConversation();
};

$("clearAll").onclick = () => {
  if (!confirm("Clear this WorkBridge session?")) return;
  localStorage.removeItem("wb_messages");
  localStorage.removeItem("wb_tasks");
  state.messages = [];
  state.tasks = [];
  renderConversation();
  renderTasks();
  updateCounts();
};

document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-item[data-page]").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach(x => x.classList.remove("active-page"));
    $(btn.dataset.page).classList.add("active-page");
    const titles = {
      translator:["Real-time Translator","แปลภาษาพม่า ↔ ไทย โดยไม่ต้องเข้าห้องประชุม"],
      conversation:["Conversation","บทสนทนาที่บันทึกไว้"],
      summary:["AI Summary","สรุปบทสนทนาและสิ่งที่ต้องทำ"],
      tasks:["Tasks","รายการงานจากบทสนทนา"],
      history:["History","ประวัติการใช้งานบนเครื่องนี้"]
    };
    $("pageTitle").textContent = titles[btn.dataset.page][0];
    $("pageSubtitle").textContent = titles[btn.dataset.page][1];
    if (btn.dataset.page === "conversation") renderConversation();
    if (btn.dataset.page === "tasks") renderTasks();
  };
});

updateLanguageLabels();
renderConversation();
renderTasks();
updateCounts();

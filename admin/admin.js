// Auth Verification
const token = localStorage.getItem("dsspl_token");
const user = JSON.parse(localStorage.getItem("dsspl_user") || "null");

if (!token || !user) {
  logout();
}

// Global state
let activeMatch = null;
let timerInterval = null;
let allMatches = [];
let allDals = [];

// Sports Catalogue Matching Scoreboard Client
const SPORTS = [
  { id: 1, name: "Basketball", icon: "🏀" },
  { id: 2, name: "Football", icon: "⚽" },
  { id: 3, name: "Cricket", icon: "🏏" },
  { id: 4, name: "Volleyball", icon: "🏐" },
  { id: 5, name: "Badminton", icon: "🏸" },
  { id: 6, name: "Table Tennis", icon: "🏓" },
  { id: 7, name: "Athletics (100m)", icon: "🏃" },
  { id: 8, name: "Athletics (400m)", icon: "🏃" },
  { id: 9, name: "Athletics (Relay)", icon: "🔁" },
  { id: 10, name: "Kho-Kho", icon: "🤸" },
  { id: 11, name: "Chess", icon: "♟️" },
  { id: 12, name: "Carrom", icon: "🎯" },
  { id: 13, name: "Tug of War", icon: "💪" },
  { id: 14, name: "Long Jump", icon: "🦘" },
  { id: 15, name: "Javelin Throw", icon: "🎿" },
  { id: 16, name: "Discus Throw", icon: "🥏" },
  { id: 17, name: "Shot Put", icon: "⚫" }
];

// Socket.IO Init
const socket = io();

// Set up UI Profiles
document.getElementById("profileName").textContent = user.username;
document.getElementById("profileRole").textContent = user.role.replace("_", " ");
document.getElementById("avatarName").textContent = user.username.substring(0, 2).toUpperCase();

// Theme Toggle Setup
const themeToggleBtn = document.getElementById("themeToggleBtn");
const savedTheme = localStorage.getItem("admin_theme") || "dark";
document.body.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.body.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("admin_theme", newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector("i");
  if (theme === "light") {
    icon.className = "ri-moon-line";
  } else {
    icon.className = "ri-sun-line";
  }
}

// RBAC: Sidebar Visibility Filters
const sidebarItems = document.querySelectorAll(".sidebar-menu .menu-item");
sidebarItems.forEach((item) => {
  const access = item.getAttribute("data-access");
  if (access === "ALL") return;

  if (user.role === "SUPER_ADMIN") return; // Super admin has full visibility

  if (access === "ORGANISER" && user.role === "ORGANISER_TEAM") return;
  if (access === "CREATOR" && user.role === "CREATOR_TEAM") return;
  if (access === "MEDIA" && user.role === "MEDIA_TEAM") return;

  item.style.display = "none"; // Hide disallowed tabs
});

// Tab Navigation
const tabButtons = document.querySelectorAll(".menu-btn");
const tabContents = document.querySelectorAll(".tab-content");
const viewTitle = document.getElementById("viewTitle");
const sidebar = document.getElementById("sidebar");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Mobile side-bar collapse on select
    sidebar.classList.remove("open");

    const tab = btn.getAttribute("data-tab");
    
    // Set active button
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Set active pane
    tabContents.forEach(c => c.classList.remove("active"));
    const activePane = document.getElementById(`tab-${tab}`);
    activePane.classList.add("active");

    // Update Header Title
    viewTitle.textContent = btn.querySelector("span").textContent;

    // Load data for selected view
    loadTabData(tab);
  });
});

// Mobile Sidebar Toggles
document.getElementById("openSidebarBtn").addEventListener("click", () => {
  sidebar.classList.add("open");
});
document.getElementById("closeSidebarBtn").addEventListener("click", () => {
  sidebar.classList.remove("open");
});

// Logout Event
document.getElementById("logoutBtn").addEventListener("click", logout);

function logout() {
  localStorage.removeItem("dsspl_token");
  localStorage.removeItem("dsspl_user");
  window.location.href = "login.html";
}

// ── API Caller Helper ─────────────────────────────────────────────────────────
async function apiCall(url, options = {}) {
  const headers = options.headers || {};
  headers["Authorization"] = `Bearer ${token}`;
  
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    logout();
  }
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Request failed");
  }

  return response.json();
}

// ── Load Data Functions ───────────────────────────────────────────────────────

async function loadTabData(tab) {
  try {
    switch (tab) {
      case "dashboard":
        await loadMatches();
        renderDashboard();
        break;
      case "match-control":
        await loadMatches();
        populateScorerSelect();
        break;
      case "scheduling":
        await loadDals();
        await loadMatches();
        renderSchedulingList();
        break;
      case "teams":
        await loadDals();
        renderTeamsList();
        break;
      case "news":
        await loadNews();
        break;
      case "media":
        await loadMedia();
        break;
      case "users":
        await loadUsers();
        break;
      case "scoreboard":
        const iframe = document.getElementById("scoreboardIframe");
        if (iframe) {
          iframe.src = iframe.src;
        }
        break;
    }
  } catch (error) {
    console.error("Tab load error:", error);
  }
}

// Fetch lists
async function loadMatches() {
  allMatches = await apiCall("/api/matches");
}

async function loadDals() {
  allDals = await apiCall("/api/mandals");
}

async function loadNews() {
  const news = await apiCall("/api/news");
  const tbody = document.getElementById("newsList");
  tbody.innerHTML = "";
  
  news.forEach((post) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${post.title}</strong></td>
      <td>${post.author.username}</td>
      <td>${new Date(post.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteNews(${post.id})">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadMedia() {
  const mediaList = await apiCall("/api/media");
  const tbody = document.getElementById("mediaList");
  tbody.innerHTML = "";

  mediaList.forEach((media) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${media.type === "IMAGE" 
          ? `<img src="${media.url}" style="height: 35px; border-radius: 4px;">` 
          : `<i class="ri-video-line" style="font-size: 24px; color: var(--primary)"></i>`}
      </td>
      <td>${media.title}</td>
      <td><span class="badge badge-paused">${media.type}</span></td>
      <td><a href="${media.url}" target="_blank" style="color: var(--accent);">${media.url}</a></td>
      <td>${new Date(media.createdAt).toLocaleDateString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadUsers() {
  const tbody = document.getElementById("usersList");
  tbody.innerHTML = `
    <tr>
      <td>admin</td>
      <td><span class="badge badge-live">SUPER_ADMIN</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>organiser</td>
      <td><span class="badge badge-scheduled">ORGANISER_TEAM</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>creator</td>
      <td><span class="badge badge-paused">CREATOR_TEAM</span></td>
      <td>System</td>
    </tr>
    <tr>
      <td>media</td>
      <td><span class="badge badge-completed">MEDIA_TEAM</span></td>
      <td>System</td>
    </tr>
  `;
}

// ── Rendering Dashboard ───────────────────────────────────────────────────────

function renderDashboard() {
  const liveCount = allMatches.filter(m => m.status === "live").length;
  const scheduledCount = allMatches.filter(m => m.status === "scheduled").length;
  const completedCount = allMatches.filter(m => m.status === "completed").length;

  document.getElementById("statLiveCount").textContent = liveCount;
  document.getElementById("statScheduledCount").textContent = scheduledCount;
  document.getElementById("statCompletedCount").textContent = completedCount;

  const tbody = document.getElementById("dashboardLiveMatchesList");
  tbody.innerHTML = "";

  const liveMatches = allMatches.filter(m => m.status === "live");
  if (liveMatches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No live matches running</td></tr>`;
    return;
  }

  liveMatches.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.sportName}</strong></td>
      <td>${m.dalA.name} VS ${m.dalB.name}</td>
      <td>${m.venue}</td>
      <td><span style="font-weight: 700; color: var(--accent); font-size: 16px;">${m.scoreA} : ${m.scoreB}</span></td>
      <td><span class="badge badge-live">Live</span></td>
      <td>
        <button class="btn btn-secondary" onclick="openScorerPanel(${m.id})">Scoring Control</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openScorerPanel(id) {
  // Switch to scorer tab
  const btn = document.querySelector(".menu-btn[data-tab='match-control']");
  if (btn) {
    btn.click();
    setTimeout(() => {
      document.getElementById("scorerMatchSelect").value = id;
      document.getElementById("scorerMatchSelect").dispatchEvent(new Event("change"));
    }, 100);
  }
}

// ── Rendering Scheduling List ────────────────────────────────────────────────

function renderSchedulingList() {
  const tbody = document.getElementById("scheduleMatchesList");
  tbody.innerHTML = "";

  allMatches.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.sportName}</strong></td>
      <td>${m.dalA.name} VS ${m.dalB.name}</td>
      <td>${m.venue}</td>
      <td>${new Date(m.createdAt).toLocaleDateString()}</td>
      <td><span class="badge badge-${m.status}">${m.status}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          ${m.status !== "live" && m.status !== "completed" ? `
            <button class="btn btn-icon" title="Start Live" onclick="setMatchStatus(${m.id}, 'live')">
              <i class="ri-play-fill" style="color: var(--success)"></i>
            </button>
          ` : ""}
          <button class="btn btn-icon btn-danger" onclick="deleteMatch(${m.id})">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTeamsList() {
  const tbody = document.getElementById("teamsList");
  tbody.innerHTML = "";

  allDals.forEach((mandal) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${mandal.abbreviation}</strong></td>
      <td>${mandal.name}</td>
      <td><span style="display: inline-block; width: 15px; height: 15px; border-radius: 50%; background-color: ${mandal.color}"></span></td>
      <td>${mandal.logoUrl}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Scorer Panel Logic ────────────────────────────────────────────────────────

const scorerMatchSelect = document.getElementById("scorerMatchSelect");
const scorerPanel = document.getElementById("scorerPanel");

function populateScorerSelect() {
  scorerMatchSelect.innerHTML = `<option value="">-- No Active Match Selected --</option>`;
  
  // Show active or scheduled matches
  allMatches.filter(m => m.status !== "completed").forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = `${m.sportName}: ${m.dalA.name} vs ${m.dalB.name} (${m.status})`;
    scorerMatchSelect.appendChild(option);
  });

  if (activeMatch) {
    scorerMatchSelect.value = activeMatch.id;
  }
}

scorerMatchSelect.addEventListener("change", async (e) => {
  const val = e.target.value;
  if (!val) {
    scorerPanel.style.display = "none";
    activeMatch = null;
    stopTimerDisplay();
    return;
  }

  try {
    activeMatch = await apiCall(`/api/matches/${val}`);
    renderScorerPanel();
    scorerPanel.style.display = "block";
  } catch (error) {
    console.error("Match fetch failed:", error);
  }
});

function renderScorerPanel() {
  if (!activeMatch) return;
  
  document.getElementById("scorerTeamAName").textContent = activeMatch.dalA.name;
  document.getElementById("scorerTeamBName").textContent = activeMatch.dalB.name;
  document.getElementById("scorerTeamAScore").textContent = activeMatch.scoreA;
  document.getElementById("scorerTeamBScore").textContent = activeMatch.scoreB;

  // Cricket fields
  document.getElementById("cricketOvers").value = activeMatch.overs ?? 0.0;
  document.getElementById("cricketWickets").value = activeMatch.wickets ?? 0;
  document.getElementById("cricketBatsman").value = activeMatch.currentBatsman ?? "";
  document.getElementById("cricketBowler").value = activeMatch.currentBowler ?? "";
  document.getElementById("cricketRunRate").value = activeMatch.runRate ?? 0.0;
  document.getElementById("matchTournament").value = activeMatch.tournamentName ?? "DSSPL 2026";
  document.getElementById("matchResult").value = activeMatch.result ?? "";
  document.getElementById("matchBanner").value = activeMatch.matchBanner ?? "";

  // Timer Setup
  startTimerDisplay();
}

function startTimerDisplay() {
  stopTimerDisplay();
  
  const timerLabel = document.getElementById("scorerTimer");
  
  const updateTimer = () => {
    if (!activeMatch) return;
    
    let seconds = activeMatch.elapsedSeconds;
    if (activeMatch.timerRunning && activeMatch.timerStartedAt) {
      const now = Date.now();
      seconds += Math.max(0, Math.floor((now - activeMatch.timerStartedAt) / 1000));
    }
    
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerLabel.textContent = `${m}:${s}`;
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimerDisplay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Global Adjust Score Trigger
window.adjustScore = async function(side, delta) {
  if (!activeMatch) return;
  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/score`, {
      method: "POST",
      body: JSON.stringify({ side, delta })
    });
    activeMatch = updated;
    renderScorerPanel();
  } catch (error) {
    alert(error.message);
  }
};

// Timer Trigger Controls
document.getElementById("scorerStartBtn").addEventListener("click", () => setTimerStatus("live"));
document.getElementById("scorerPauseBtn").addEventListener("click", () => setTimerStatus("paused"));
document.getElementById("scorerResetTimerBtn").addEventListener("click", () => setTimerStatus("reset_timer"));
document.getElementById("scorerCompleteBtn").addEventListener("click", () => setTimerStatus("completed"));

async function setTimerStatus(status) {
  if (!activeMatch) return;
  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    activeMatch = updated;
    renderScorerPanel();
    
    if (status === "completed") {
      activeMatch = null;
      scorerMatchSelect.value = "";
      scorerPanel.style.display = "none";
      stopTimerDisplay();
      await loadMatches();
      populateScorerSelect();
    }
  } catch (error) {
    alert(error.message);
  }
}

// Save detailed scoring data
document.getElementById("cricketDetailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeMatch) return;

  const data = {
    overs: document.getElementById("cricketOvers").value,
    wickets: document.getElementById("cricketWickets").value,
    currentBatsman: document.getElementById("cricketBatsman").value,
    currentBowler: document.getElementById("cricketBowler").value,
    runRate: document.getElementById("cricketRunRate").value,
    tournamentName: document.getElementById("matchTournament").value,
    result: document.getElementById("matchResult").value,
    matchBanner: document.getElementById("matchBanner").value,
  };

  try {
    const updated = await apiCall(`/api/matches/${activeMatch.id}/cricket`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    activeMatch = updated;
    alert("Match metadata updated successfully.");
  } catch (error) {
    alert(error.message);
  }
});

// Delete match function
window.deleteMatch = async function(id) {
  if (!confirm("Are you sure you want to delete this match?")) return;
  try {
    await apiCall(`/api/matches/${id}`, { method: "DELETE" });
    await loadMatches();
    if (activeMatch && activeMatch.id == id) {
      activeMatch = null;
      scorerPanel.style.display = "none";
      stopTimerDisplay();
    }
    loadTabData(document.querySelector(".menu-btn.active").getAttribute("data-tab"));
  } catch (error) {
    alert(error.message);
  }
};

// Start Match Schedule function
window.setMatchStatus = async function(id, status) {
  try {
    await apiCall(`/api/matches/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status })
    });
    await loadMatches();
    loadTabData(document.querySelector(".menu-btn.active").getAttribute("data-tab"));
  } catch (error) {
    alert(error.message);
  }
};

// ── Modals Logic ──────────────────────────────────────────────────────────────
const newMatchModal = document.getElementById("newMatchModal");
const openNewMatchModalBtn = document.getElementById("openNewMatchModalBtn");
const closeNewMatchModalBtn = document.getElementById("closeNewMatchModalBtn");
const cancelNewMatchBtn = document.getElementById("cancelNewMatchBtn");

if (openNewMatchModalBtn) {
  openNewMatchModalBtn.addEventListener("click", async () => {
    // Fill select selectors
    const sportSelect = document.getElementById("matchSport");
    sportSelect.innerHTML = SPORTS.map(s => `<option value="${s.id}">${s.icon} ${s.name}</option>`).join("");

    const dalASelect = document.getElementById("matchDalA");
    const dalBSelect = document.getElementById("matchDalB");
    dalASelect.innerHTML = allDals.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
    dalBSelect.innerHTML = allDals.map(d => `<option value="${d.id}">${d.name}</option>`).join("");

    newMatchModal.style.display = "flex";
  });
}

const closeModal = () => { newMatchModal.style.display = "none"; };
if (closeNewMatchModalBtn) closeNewMatchModalBtn.addEventListener("click", closeModal);
if (cancelNewMatchBtn) cancelNewMatchBtn.addEventListener("click", closeModal);

document.getElementById("newMatchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const sportId = document.getElementById("matchSport").value;
  const sport = SPORTS.find(s => s.id == sportId);
  const venue = document.getElementById("matchVenue").value;
  const dalAId = document.getElementById("matchDalA").value;
  const dalBId = document.getElementById("matchDalB").value;
  const duration = document.getElementById("matchDuration").value;
  const isLive = document.getElementById("matchIsLive").value === "true";

  if (dalAId === dalBId) {
    alert("Mandals must be unique teams!");
    return;
  }

  try {
    await apiCall("/api/matches", {
      method: "POST",
      body: JSON.stringify({
        sportId,
        sportName: sport.name,
        venue,
        dalAId,
        dalBId,
        durationMinutes: duration,
        isLive
      })
    });
    closeModal();
    await loadMatches();
    loadTabData("scheduling");
  } catch (error) {
    alert(error.message);
  }
});

// ── News and Content management ───────────────────────────────────────────────

document.getElementById("newsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("newsTitle").value;
  const content = document.getElementById("newsContent").value;

  try {
    await apiCall("/api/news", {
      method: "POST",
      body: JSON.stringify({ title, content })
    });
    document.getElementById("newsTitle").value = "";
    document.getElementById("newsContent").value = "";
    await loadNews();
    alert("Article published successfully.");
  } catch (error) {
    alert(error.message);
  }
});

window.deleteNews = async function(id) {
  if (!confirm("Are you sure you want to delete this news post?")) return;
  try {
    await apiCall(`/api/news/${id}`, { method: "DELETE" });
    await loadNews();
  } catch (error) {
    alert(error.message);
  }
};

// ── Media Upload Actions ───────────────────────────────────────────────────────

document.getElementById("mediaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("mediaFile");
  const titleInput = document.getElementById("mediaTitle");

  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("title", titleInput.value);

  try {
    await apiCall("/api/media/upload", {
      method: "POST",
      body: formData
    });
    fileInput.value = "";
    titleInput.value = "";
    await loadMedia();
    alert("Media asset uploaded successfully.");
  } catch (error) {
    alert(error.message);
  }
});

// ── Realtime Socket Sync ──────────────────────────────────────────────────────

socket.on("matchUpdate", (data) => {
  console.log("Realtime matchUpdate event received:", data);
  
  // Update in global match cache
  const idx = allMatches.findIndex(m => m.id.toString() == data.id.toString());
  if (idx !== -1) {
    allMatches[idx] = data;
  } else {
    allMatches.unshift(data);
  }

  // Update Scorer Panel if currently viewing this match
  if (activeMatch && activeMatch.id.toString() == data.id.toString()) {
    activeMatch = data;
    renderScorerPanel();
  }

  // Update active views
  const activeTab = document.querySelector(".menu-btn.active").getAttribute("data-tab");
  if (activeTab === "dashboard") {
    renderDashboard();
  } else if (activeTab === "scheduling") {
    renderSchedulingList();
  } else if (activeTab === "match-control") {
    populateScorerSelect();
  }
});

socket.on("matchDelete", (matchId) => {
  console.log("Realtime matchDelete event received:", matchId);
  allMatches = allMatches.filter(m => m.id.toString() != matchId.toString());
  if (activeMatch && activeMatch.id.toString() == matchId.toString()) {
    activeMatch = null;
    scorerPanel.style.display = "none";
    stopTimerDisplay();
  }
  const activeTab = document.querySelector(".menu-btn.active").getAttribute("data-tab");
  loadTabData(activeTab);
});

socket.on("newsUpdate", () => {
  if (document.querySelector(".menu-btn.active").getAttribute("data-tab") === "news") {
    loadNews();
  }
});

socket.on("mediaUpdate", () => {
  if (document.querySelector(".menu-btn.active").getAttribute("data-tab") === "media") {
    loadMedia();
  }
});

// Load Initial tab
loadTabData("dashboard");

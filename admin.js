(function () {
  const runtimeConfig = window.POOLILY_RUNTIME_CONFIG || {};
  const DEFAULT_BACKEND_ENDPOINT = "https://objcsfzlelbdswfcaerb.supabase.co/functions/v1/poolily-gateway";
  const storage = {
    backendUrl: "poolily_admin_backend_url",
  };

  const summaryGrid = document.getElementById("summary-grid");
  const statusEl = document.getElementById("admin-status");
  const backendInput = document.getElementById("admin-backend-url");
  const keyInput = document.getElementById("admin-api-key");
  const connectBtn = document.getElementById("connect-btn");
  const refreshBtn = document.getElementById("refresh-btn");

  const tableTargets = {
    users: document.getElementById("users-table"),
    requests: document.getElementById("requests-table"),
    rides: document.getElementById("rides-table"),
    transactions: document.getElementById("transactions-table"),
    deposits: document.getElementById("deposits-table"),
    events: document.getElementById("events-table"),
  };

  const countTargets = {
    users: document.getElementById("users-count"),
    requests: document.getElementById("requests-count"),
    rides: document.getElementById("rides-count"),
    transactions: document.getElementById("transactions-count"),
    deposits: document.getElementById("deposits-count"),
    events: document.getElementById("events-count"),
  };

  function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatNaira(value) {
    return "N" + toNum(value, 0).toLocaleString();
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderBadge(value) {
    const normalized = String(value || "").toLowerCase();
    let cls = "warn";
    if (["completed", "success", "credit", "requested", "deposit"].includes(normalized)) cls = "ok";
    if (["cancelled", "error", "failed", "debit", "feedback_complaint_submitted"].includes(normalized)) cls = "stop";
    return `<span class="badge ${cls}">${escapeHtml(value || "-")}</span>`;
  }

  function setStatus(message, type = "") {
    statusEl.textContent = message;
    statusEl.className = type ? `status ${type}` : "status";
  }

  function getBackendUrl() {
    return (backendInput.value.trim() || localStorage.getItem(storage.backendUrl) || runtimeConfig.adminBackendUrl || runtimeConfig.backendUrl || DEFAULT_BACKEND_ENDPOINT).trim();
  }

  async function adminRequest(action, payload = {}) {
    const backendUrl = getBackendUrl();
    if (!backendUrl) throw new Error("Backend URL is required.");
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("payload", JSON.stringify(payload));
    const res = await fetch(backendUrl, { method: "POST", body });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error("Admin API returned a non-JSON response.");
    }
    if (!res.ok || !data || data.success === false) {
      throw new Error((data && data.message) || "Admin request failed.");
    }
    return data;
  }

  function renderSummary(summary, fetchedAt) {
    const cards = [
      ["Users", summary.usersTotal, `${summary.driversTotal} drivers / ${summary.passengersTotal} passengers`],
      ["Wallet Balance", formatNaira(summary.walletBalanceTotal), `Passengers ${formatNaira(summary.walletBalancePassengers)} / Drivers ${formatNaira(summary.walletBalanceDrivers)}`],
      ["Rides", summary.ridesTotal, `${summary.ridesCompleted} completed / ${summary.ridesCancelled} cancelled`],
      ["Open Requests", summary.openRideRequests, `${summary.depositsTotal} deposits / ${summary.walletTransactionsTotal} wallet tx`],
      ["Complaints", summary.complaintsTotal, `${summary.eventsTotal} total events logged`],
      ["Recent Deposits", formatNaira(summary.recentDepositsAmount), `Across latest deposit rows`],
      ["Fetched At", formatDate(fetchedAt), "Latest admin snapshot"],
    ];
    summaryGrid.innerHTML = cards.map(([label, value, note]) => `
      <div class="metric-card">
        <h3>${escapeHtml(label)}</h3>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(note)}</span>
      </div>
    `).join("");
  }

  function renderTable(target, headers, rowsHtml) {
    if (!rowsHtml.length) {
      target.innerHTML = `<p class="empty">No rows available.</p>`;
      return;
    }
    target.innerHTML = `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>${rowsHtml.join("")}</tbody>
      </table>
    `;
  }

  function renderUsers(users) {
    countTargets.users.textContent = String(users.length);
    renderTable(tableTargets.users, ["User", "Role", "Wallet", "Account", "Login", "Created"], users.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.phone || "-")}</span></td>
        <td>${renderBadge(row.role)}</td>
        <td>${escapeHtml(formatNaira(row.walletBalance))}</td>
        <td class="mono">${escapeHtml(row.walletAccountNumber || "-")}</td>
        <td>${escapeHtml(formatDate(row.lastLoginAt))}</td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  function renderRequests(requests) {
    countTargets.requests.textContent = String(requests.length);
    renderTable(tableTargets.requests, ["Rider", "Route", "Fare", "Drop", "Status", "Requested"], requests.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.rider?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.rider?.phone || "-")}</span></td>
        <td>${escapeHtml(row.pickup)}<br><span class="muted">to ${escapeHtml(row.destination)}</span></td>
        <td>${escapeHtml(formatNaira(row.quotedFare))}</td>
        <td>${escapeHtml(row.dropStyle || "-")}</td>
        <td>${renderBadge(row.status)}</td>
        <td>${escapeHtml(formatDate(row.requestedAt))}</td>
      </tr>
    `));
  }

  function renderRides(rides) {
    countTargets.rides.textContent = String(rides.length);
    renderTable(tableTargets.rides, ["Passenger", "Driver", "Route", "Fare", "Status", "Ended"], rides.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.passenger?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.passenger?.phone || "-")}</span></td>
        <td><strong>${escapeHtml(row.driver?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.driver?.plateNumber || "-")}</span></td>
        <td>${escapeHtml(row.pickup)}<br><span class="muted">to ${escapeHtml(row.destination)}</span></td>
        <td>${escapeHtml(formatNaira(row.fare))}</td>
        <td>${renderBadge(row.status)}</td>
        <td>${escapeHtml(formatDate(row.tripEndedAt || row.createdAt))}</td>
      </tr>
    `));
  }

  function renderTransactions(rows) {
    countTargets.transactions.textContent = String(rows.length);
    renderTable(tableTargets.transactions, ["User", "Type", "Description", "Amount", "Balance After", "When"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.user?.role || "-")}</span></td>
        <td>${renderBadge(row.transactionType)}<br><span class="muted">${escapeHtml(row.sourceType || "-")}</span></td>
        <td>${escapeHtml(row.description || "-")}<br><span class="muted mono">${escapeHtml(row.referenceId || "-")}</span></td>
        <td>${escapeHtml(formatNaira(row.amount))}</td>
        <td>${escapeHtml(formatNaira(row.balanceAfter))}</td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  function renderDeposits(rows) {
    countTargets.deposits.textContent = String(rows.length);
    renderTable(tableTargets.deposits, ["User", "Sender", "Bank", "Amount", "Wallet", "Deposited"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.user?.phone || "-")}</span></td>
        <td>${escapeHtml(row.senderName || "-")}</td>
        <td>${escapeHtml(row.sourceBank || "-")}</td>
        <td>${escapeHtml(formatNaira(row.amount))}</td>
        <td class="mono">${escapeHtml(row.walletAccountNumber || "-")}</td>
        <td>${escapeHtml(formatDate(row.depositedAt))}</td>
      </tr>
    `));
  }

  function renderEvents(rows) {
    countTargets.events.textContent = String(rows.length);
    renderTable(tableTargets.events, ["User", "Event", "Details", "When"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><br><span class="muted">${escapeHtml(row.user?.role || "-")}</span></td>
        <td>${renderBadge(row.eventName)}</td>
        <td><pre class="json">${escapeHtml(JSON.stringify(row.eventData || {}, null, 2))}</pre></td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  async function loadDashboard() {
    const backendUrl = getBackendUrl();
    const adminKey = keyInput.value.trim();
    if (!backendUrl || !adminKey) {
      setStatus("Backend URL and admin key are required.", "error");
      return;
    }

    connectBtn.disabled = true;
    refreshBtn.disabled = true;
    setStatus("Loading admin dashboard...", "");
    localStorage.setItem(storage.backendUrl, backendUrl);

    try {
      const data = await adminRequest("getAdminDashboard", {
        adminKey,
        limit: 25,
      });
      renderSummary(data.summary || {}, data.fetchedAt);
      renderUsers(data.recentUsers || []);
      renderRequests(data.rideRequests || []);
      renderRides(data.rides || []);
      renderTransactions(data.walletTransactions || []);
      renderDeposits(data.deposits || []);
      renderEvents(data.events || []);
      setStatus("Dashboard loaded successfully.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load admin dashboard.", "error");
    } finally {
      connectBtn.disabled = false;
      refreshBtn.disabled = false;
    }
  }

  backendInput.value = getBackendUrl();
  connectBtn.addEventListener("click", loadDashboard);
  refreshBtn.addEventListener("click", loadDashboard);
})();

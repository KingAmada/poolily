(function () {
  const runtimeConfig = window.POOLILY_RUNTIME_CONFIG || {};
  const DEFAULT_BACKEND_ENDPOINT = "https://objcsfzlelbdswfcaerb.supabase.co/functions/v1/poolily-gateway";
  const storage = {
    backendUrl: "poolily_admin_backend_url",
    refreshInterval: "poolily_admin_refresh_interval",
  };

  const ABUJA_POINTS = {
    "nnamdi azikiwe international airport": { x: 12, y: 62, label: "Airport" },
    "international arrival": { x: 14, y: 59, label: "International Arrival" },
    "terminal a": { x: 15, y: 58, label: "Terminal A" },
    "terminal b": { x: 16, y: 57, label: "Terminal B" },
    "terminal c": { x: 17, y: 56, label: "Terminal C" },
    "gwarinpa": { x: 46, y: 36, label: "Gwarinpa" },
    "wuse": { x: 58, y: 44, label: "Wuse" },
    "wuse 2": { x: 62, y: 46, label: "Wuse 2" },
    "maitama": { x: 64, y: 34, label: "Maitama" },
    "asokoro": { x: 76, y: 66, label: "Asokoro" },
    "garki": { x: 66, y: 58, label: "Garki" },
    "jabi": { x: 56, y: 39, label: "Jabi" },
    "kubwa": { x: 34, y: 28, label: "Kubwa" },
    "lugbe": { x: 45, y: 76, label: "Lugbe" },
    "gudu": { x: 69, y: 61, label: "Gudu" },
    "katampe": { x: 59, y: 30, label: "Katampe" },
    "utako": { x: 54, y: 41, label: "Utako" },
    "central area": { x: 67, y: 50, label: "Central Area" },
    "lokogoma": { x: 78, y: 82, label: "Lokogoma" },
    "jahi": { x: 60, y: 37, label: "Jahi" },
  };

  const summaryGrid = document.getElementById("summary-grid");
  const statusEl = document.getElementById("admin-status");
  const backendInput = document.getElementById("admin-backend-url");
  const keyInput = document.getElementById("admin-api-key");
  const connectBtn = document.getElementById("connect-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIntervalInput = document.getElementById("refresh-interval");
  const timeFilter = document.getElementById("time-filter");
  const searchFilter = document.getElementById("search-filter");
  const rideStatusFilter = document.getElementById("ride-status-filter");
  const roleFilter = document.getElementById("role-filter");
  const sortFilter = document.getElementById("sort-filter");
  const liveIndicator = document.getElementById("live-indicator");
  const lastSyncLabel = document.getElementById("last-sync-label");
  const loadedRowsLabel = document.getElementById("loaded-rows-label");
  const opsPulseLabel = document.getElementById("ops-pulse-label");
  const ridesTodayPill = document.getElementById("rides-today-pill");

  const panels = {
    ridesBarChart: document.getElementById("rides-bar-chart"),
    rolePieChart: document.getElementById("role-pie-chart"),
    paymentsBarChart: document.getElementById("payments-bar-chart"),
    opsMap: document.getElementById("ops-map"),
    signupFeed: document.getElementById("signup-feed"),
    exceptionsFeed: document.getElementById("exceptions-feed"),
  };

  const tableTargets = {
    users: document.getElementById("users-table"),
    drivers: document.getElementById("drivers-table"),
    requests: document.getElementById("requests-table"),
    rides: document.getElementById("rides-table"),
    transactions: document.getElementById("transactions-table"),
    deposits: document.getElementById("deposits-table"),
    events: document.getElementById("events-table"),
  };

  const countTargets = {
    users: document.getElementById("users-count"),
    drivers: document.getElementById("drivers-count"),
    requests: document.getElementById("requests-count"),
    rides: document.getElementById("rides-count"),
    transactions: document.getElementById("transactions-count"),
    deposits: document.getElementById("deposits-count"),
    events: document.getElementById("events-count"),
  };

  const state = {
    dashboard: null,
    autoRefreshId: null,
    activeTab: "overview",
  };

  function toNum(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatNaira(value) {
    return "N" + toNum(value).toLocaleString("en-NG");
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function matchesTimeWindow(value) {
    if (!value) return false;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return false;
    const filter = timeFilter.value;
    const now = Date.now();
    if (filter === "today") return time >= startOfToday().getTime();
    if (filter === "7d") return time >= now - (7 * 24 * 60 * 60 * 1000);
    if (filter === "30d") return time >= now - (30 * 24 * 60 * 60 * 1000);
    return true;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function inferLocation(label, index) {
    const key = normalize(label);
    if (ABUJA_POINTS[key]) return ABUJA_POINTS[key];
    for (const [name, point] of Object.entries(ABUJA_POINTS)) {
      if (key.includes(name)) return point;
    }
    return {
      x: 28 + ((index * 11) % 52),
      y: 24 + ((index * 9) % 58),
      label: label || "Unknown",
    };
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = type ? `status ${type}` : "status";
  }

  function setLiveState(type, label) {
    liveIndicator.textContent = label;
    liveIndicator.className = `live-indicator ${type}`;
  }

  function renderBadge(value) {
    const normalized = normalize(value);
    let cls = "warn";
    if (["completed", "credit", "success", "matched", "requested", "deposit", "driver", "passenger"].includes(normalized)) cls = "ok";
    if (["cancelled", "failed", "error", "debit", "complaint", "feedback_complaint_submitted"].includes(normalized)) cls = "stop";
    return `<span class="badge ${cls}">${escapeHtml(value || "-")}</span>`;
  }

  function getBackendUrl() {
    return (
      backendInput.value.trim() ||
      localStorage.getItem(storage.backendUrl) ||
      runtimeConfig.adminBackendUrl ||
      runtimeConfig.backendUrl ||
      DEFAULT_BACKEND_ENDPOINT
    ).trim();
  }

  async function adminRequest(action, payload) {
    const body = new URLSearchParams();
    body.set("action", action);
    body.set("payload", JSON.stringify(payload || {}));
    const response = await fetch(getBackendUrl(), { method: "POST", body });
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error("Admin API returned a non-JSON response.");
    }
    if (!response.ok || !data || data.success === false) {
      throw new Error((data && data.message) || "Admin request failed.");
    }
    return data;
  }

  function isComplaintEvent(event) {
    const name = normalize(event.eventName);
    return name.includes("complaint") || name.includes("feedback");
  }

  function sortRows(rows, type, dateGetter, numericGetter) {
    const list = rows.slice();
    list.sort((a, b) => {
      if (type === "oldest") {
        return new Date(dateGetter(a) || 0) - new Date(dateGetter(b) || 0);
      }
      if (type === "highestFare" || type === "highestWallet") {
        return toNum(numericGetter(b)) - toNum(numericGetter(a));
      }
      return new Date(dateGetter(b) || 0) - new Date(dateGetter(a) || 0);
    });
    return list;
  }

  function isWithinSearch(row, extra) {
    const term = normalize(searchFilter.value);
    if (!term) return true;
    const haystack = normalize([
      JSON.stringify(row || {}),
      ...(extra || []),
    ].join(" "));
    return haystack.includes(term);
  }

  function applyFilters(data) {
    const roleValue = roleFilter.value;
    const rideStatus = rideStatusFilter.value;
    const sortValue = sortFilter.value;

    const recentUsers = sortRows((data.recentUsers || []).filter((row) => {
      const roleOk = roleValue === "all" || normalize(row.role) === roleValue;
      const timeOk = matchesTimeWindow(row.createdAt || row.updatedAt || row.lastLoginAt);
      return roleOk && timeOk && isWithinSearch(row, [row.fullName, row.phone, row.walletAccountNumber]);
    }), sortValue, (row) => row.createdAt || row.updatedAt || row.lastLoginAt, (row) => row.walletBalance);

    const rideRequests = sortRows((data.rideRequests || []).filter((row) => {
      const roleOk = roleValue === "all" || normalize(row.riderRole) === roleValue;
      const statusOk = rideStatus === "all" || normalize(row.status) === rideStatus;
      const timeOk = matchesTimeWindow(row.requestedAt);
      return roleOk && statusOk && timeOk && isWithinSearch(row, [
        row.pickup,
        row.destination,
        row.rider && row.rider.fullName,
        row.matchedDriver && row.matchedDriver.fullName,
      ]);
    }), sortValue, (row) => row.requestedAt, (row) => row.quotedFare);

    const rides = sortRows((data.rides || []).filter((row) => {
      const statusOk = rideStatus === "all" || normalize(row.status) === rideStatus;
      const roleOk = roleValue === "all" ||
        normalize(row.passenger && row.passenger.role) === roleValue ||
        (roleValue === "driver" && !!row.driver);
      const timeOk = matchesTimeWindow(row.tripEndedAt || row.tripStartedAt || row.createdAt);
      return statusOk && roleOk && timeOk && isWithinSearch(row, [
        row.pickup,
        row.destination,
        row.passenger && row.passenger.fullName,
        row.driver && row.driver.fullName,
      ]);
    }), sortValue, (row) => row.tripEndedAt || row.tripStartedAt || row.createdAt, (row) => row.fare);

    const walletTransactions = sortRows((data.walletTransactions || []).filter((row) => {
      const roleOk = roleValue === "all" || normalize(row.user && row.user.role) === roleValue;
      const timeOk = matchesTimeWindow(row.createdAt);
      return roleOk && timeOk && isWithinSearch(row, [
        row.description,
        row.referenceId,
        row.user && row.user.fullName,
      ]);
    }), sortValue, (row) => row.createdAt, (row) => row.amount);

    const deposits = sortRows((data.deposits || []).filter((row) => {
      const timeOk = matchesTimeWindow(row.depositedAt);
      return timeOk && isWithinSearch(row, [row.senderName, row.sourceBank, row.user && row.user.fullName]);
    }), sortValue, (row) => row.depositedAt, (row) => row.amount);

    const events = sortRows((data.events || []).filter((row) => {
      const roleOk = roleValue === "all" || normalize(row.user && row.user.role) === roleValue;
      const timeOk = matchesTimeWindow(row.createdAt);
      return roleOk && timeOk && isWithinSearch(row, [row.eventName, row.user && row.user.fullName]);
    }), sortValue, (row) => row.createdAt, () => 0);

    return {
      recentUsers,
      rideRequests,
      rides,
      walletTransactions,
      deposits,
      events,
      drivers: sortRows(recentUsers.filter((row) => normalize(row.role) === "driver"), sortValue, (row) => row.updatedAt || row.createdAt || row.lastLoginAt, (row) => row.walletBalance),
      complaints: events.filter(isComplaintEvent),
    };
  }

  function deriveOverview(data, filtered) {
    const todayStart = startOfToday().getTime();
    const ridesToday = (data.rides || []).filter((row) => {
      const ts = new Date(row.tripEndedAt || row.tripStartedAt || row.createdAt || 0).getTime();
      return !Number.isNaN(ts) && ts >= todayStart;
    });
    const requestsToday = (data.rideRequests || []).filter((row) => {
      const ts = new Date(row.requestedAt || 0).getTime();
      return !Number.isNaN(ts) && ts >= todayStart;
    });
    const signupsToday = (data.recentUsers || []).filter((row) => {
      const ts = new Date(row.createdAt || 0).getTime();
      return !Number.isNaN(ts) && ts >= todayStart;
    });
    const completedToday = ridesToday.filter((row) => normalize(row.status) === "completed");
    const cancelledToday = ridesToday.filter((row) => normalize(row.status) === "cancelled");
    const activeRides = filtered.rides.filter((row) => ["matched", "ongoing", "requested"].includes(normalize(row.status)));
    const pendingRequests = filtered.rideRequests.filter((row) => normalize(row.status) === "requested");

    return {
      ridesToday: ridesToday.length,
      requestsToday: requestsToday.length,
      signupsToday: signupsToday.length,
      completedToday: completedToday.length,
      cancelledToday: cancelledToday.length,
      activeRides: activeRides.length,
      pendingRequests: pendingRequests.length,
    };
  }

  function renderSummary(summary, overview) {
    const cards = [
      {
        label: "Marketplace Users",
        value: summary.usersTotal,
        note: `${summary.driversTotal} drivers, ${summary.passengersTotal} passengers`,
      },
      {
        label: "Wallet Exposure",
        value: formatNaira(summary.walletBalanceTotal),
        note: `Drivers ${formatNaira(summary.walletBalanceDrivers)} / Passengers ${formatNaira(summary.walletBalancePassengers)}`,
      },
      {
        label: "Rides Today",
        value: overview.ridesToday,
        note: `${overview.completedToday} completed, ${overview.cancelledToday} cancelled`,
      },
      {
        label: "Open Demand",
        value: overview.pendingRequests,
        note: `${overview.activeRides} rides currently active or matching`,
      },
      {
        label: "New Signups Today",
        value: overview.signupsToday,
        note: "Fresh profiles created since midnight",
      },
      {
        label: "Deposits Tracked",
        value: summary.depositsTotal,
        note: `${formatNaira(summary.recentDepositsAmount)} across loaded deposit rows`,
      },
      {
        label: "Complaints Logged",
        value: summary.complaintsTotal,
        note: `${summary.eventsTotal} total operational events`,
      },
      {
        label: "Wallet Transactions",
        value: summary.walletTransactionsTotal,
        note: "Credits, debits, refunds, and adjustments",
      },
    ];

    summaryGrid.innerHTML = cards.map((card) => `
      <article class="metric-card">
        <p class="metric-label">${escapeHtml(card.label)}</p>
        <div class="metric-value">${escapeHtml(card.value)}</div>
        <div class="metric-note">${escapeHtml(card.note)}</div>
      </article>
    `).join("");
  }

  function renderBarChart(target, series, color) {
    if (!series.length) {
      target.innerHTML = `<p class="empty">No chart data available for the current filter.</p>`;
      return;
    }

    const width = 680;
    const height = 260;
    const left = 56;
    const top = 18;
    const bottom = 42;
    const chartHeight = height - top - bottom;
    const chartWidth = width - left - 20;
    const max = Math.max(...series.map((item) => item.value), 1);
    const barWidth = chartWidth / series.length;
    const gridValues = 4;

    const grid = Array.from({ length: gridValues + 1 }, (_, index) => {
      const value = Math.round((max / gridValues) * (gridValues - index));
      const y = top + (chartHeight / gridValues) * index;
      return `
        <line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width - 10}" y2="${y}"></line>
        <text class="chart-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${escapeHtml(value)}</text>
      `;
    }).join("");

    const bars = series.map((item, index) => {
      const barHeight = Math.max(8, (item.value / max) * chartHeight);
      const x = left + (index * barWidth) + (barWidth * 0.15);
      const y = top + chartHeight - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth * 0.7}" height="${barHeight}" rx="12" fill="${color}"></rect>
        <text class="chart-value" x="${x + (barWidth * 0.35)}" y="${y - 8}" text-anchor="middle">${escapeHtml(item.value)}</text>
        <text class="chart-label" x="${x + (barWidth * 0.35)}" y="${height - 12}" text-anchor="middle">${escapeHtml(item.label)}</text>
      `;
    }).join("");

    target.innerHTML = `
      <svg class="bar-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart">
        ${grid}
        ${bars}
      </svg>
    `;
  }

  function renderPieChart(target, items) {
    if (!items.length) {
      target.innerHTML = `<p class="empty">No pie chart data available.</p>`;
      return;
    }

    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    const radius = 74;
    const center = 95;
    let startAngle = -Math.PI / 2;

    const slices = items.map((item) => {
      const angle = (item.value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const x1 = center + Math.cos(startAngle) * radius;
      const y1 = center + Math.sin(startAngle) * radius;
      const x2 = center + Math.cos(endAngle) * radius;
      const y2 = center + Math.sin(endAngle) * radius;
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = [
        `M ${center} ${center}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");
      startAngle = endAngle;
      return `<path d="${path}" fill="${item.color}"></path>`;
    }).join("");

    const legend = items.map((item) => `
      <div class="pie-legend-item">
        <div><span class="legend-swatch" style="background:${item.color}"></span>${escapeHtml(item.label)}</div>
        <strong>${escapeHtml(item.value)}</strong>
      </div>
    `).join("");

    target.innerHTML = `
      <svg class="pie-chart" viewBox="0 0 220 200" role="img" aria-label="Pie chart">
        <g>
          ${slices}
          <circle cx="${center}" cy="${center}" r="34" fill="#09101d"></circle>
          <text x="${center}" y="${center - 2}" text-anchor="middle" class="chart-value">${escapeHtml(total)}</text>
          <text x="${center}" y="${center + 16}" text-anchor="middle" class="chart-label">Total</text>
        </g>
      </svg>
      <div class="pie-legend">${legend}</div>
    `;
  }

  function renderTable(target, headers, rowsHtml) {
    if (!rowsHtml.length) {
      target.innerHTML = `<p class="empty">No rows available for the current filter.</p>`;
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
    renderTable(tableTargets.users, ["User", "Role", "Wallet", "Vehicle", "Last Login", "Created"], users.map((row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.fullName || "-")}</strong>
          <div class="table-subtext">${escapeHtml(row.phone || "-")}</div>
        </td>
        <td>${renderBadge(row.role)}</td>
        <td>${escapeHtml(formatNaira(row.walletBalance))}<div class="table-subtext mono">${escapeHtml(row.walletAccountNumber || "-")}</div></td>
        <td>${escapeHtml(row.car || "-")}<div class="table-subtext">${escapeHtml(row.plateNumber || "No plate")}</div></td>
        <td>${escapeHtml(formatDate(row.lastLoginAt))}</td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  function renderDrivers(drivers) {
    countTargets.drivers.textContent = String(drivers.length);
    renderTable(tableTargets.drivers, ["Driver", "Phone", "Vehicle", "Wallet", "Recent Activity"], drivers.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.fullName || "-")}</strong></td>
        <td>${escapeHtml(row.phone || "-")}</td>
        <td>${escapeHtml(row.car || "-")}<div class="table-subtext">${escapeHtml(row.plateNumber || "-")}</div></td>
        <td>${escapeHtml(formatNaira(row.walletBalance))}</td>
        <td>${escapeHtml(formatDate(row.updatedAt || row.lastLoginAt || row.createdAt))}</td>
      </tr>
    `));
  }

  function renderRequests(rows) {
    countTargets.requests.textContent = String(rows.length);
    renderTable(tableTargets.requests, ["Rider", "Route", "Fare", "Seats", "Assigned Driver", "Status", "Requested"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.rider?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.rider?.phone || "-")}</div></td>
        <td>${escapeHtml(row.pickup || "-")}<div class="table-subtext">to ${escapeHtml(row.destination || "-")}</div></td>
        <td>${escapeHtml(formatNaira(row.quotedFare))}</td>
        <td>${escapeHtml(row.seats)}</td>
        <td>${escapeHtml(row.matchedDriver?.fullName || "Unassigned")}</td>
        <td>${renderBadge(row.status)}</td>
        <td>${escapeHtml(formatDate(row.requestedAt))}</td>
      </tr>
    `));
  }

  function renderRides(rows) {
    countTargets.rides.textContent = String(rows.length);
    renderTable(tableTargets.rides, ["Passenger", "Driver", "Route", "Fare", "Status", "Progress", "Ended"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.passenger?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.passenger?.phone || "-")}</div></td>
        <td><strong>${escapeHtml(row.driver?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.driver?.plateNumber || "-")}</div></td>
        <td>${escapeHtml(row.pickup || "-")}<div class="table-subtext">to ${escapeHtml(row.destination || "-")}</div></td>
        <td>${escapeHtml(formatNaira(row.fare))}</td>
        <td>${renderBadge(row.status)}</td>
        <td>${escapeHtml(row.reachedDestination ? "Destination reached" : "In progress / not confirmed")}</td>
        <td>${escapeHtml(formatDate(row.tripEndedAt || row.createdAt))}</td>
      </tr>
    `));
  }

  function renderTransactions(rows) {
    countTargets.transactions.textContent = String(rows.length);
    renderTable(tableTargets.transactions, ["User", "Type", "Description", "Amount", "After", "When"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.user?.role || "-")}</div></td>
        <td>${renderBadge(row.transactionType)}<div class="table-subtext">${escapeHtml(row.sourceType || "-")}</div></td>
        <td>${escapeHtml(row.description || "-")}<div class="table-subtext mono">${escapeHtml(row.referenceId || "-")}</div></td>
        <td>${escapeHtml(formatNaira(row.amount))}</td>
        <td>${escapeHtml(formatNaira(row.balanceAfter))}</td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  function renderDeposits(rows) {
    countTargets.deposits.textContent = String(rows.length);
    renderTable(tableTargets.deposits, ["User", "Sender", "Source Bank", "Amount", "Wallet", "Deposited"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.user?.phone || "-")}</div></td>
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
    renderTable(tableTargets.events, ["User", "Event", "Details", "Time"], rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.user?.fullName || "-")}</strong><div class="table-subtext">${escapeHtml(row.user?.role || "-")}</div></td>
        <td>${renderBadge(row.eventName)}</td>
        <td><pre class="json">${escapeHtml(JSON.stringify(row.eventData || {}, null, 2))}</pre></td>
        <td>${escapeHtml(formatDate(row.createdAt))}</td>
      </tr>
    `));
  }

  function renderSignalFeed(target, items, emptyText) {
    if (!items.length) {
      target.innerHTML = `<p class="empty">${escapeHtml(emptyText)}</p>`;
      return;
    }
    target.innerHTML = items.map((item) => `
      <article class="signal-card">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
      </article>
    `).join("");
  }

  function renderOpsMap(filtered) {
    const airport = inferLocation("Nnamdi Azikiwe International Airport", 0);
    const requestMarkup = filtered.rideRequests.slice(0, 8).map((row, index) => {
      const point = inferLocation(row.destination || row.pickup, index + 1);
      const dx = point.x - airport.x;
      const dy = point.y - airport.y;
      const length = Math.sqrt((dx * dx) + (dy * dy));
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return `
        <div class="map-route request" style="left:${airport.x}%;top:${airport.y}%;width:${length}%;transform:rotate(${angle}deg);"></div>
        <div class="map-node request" style="left:${point.x}%;top:${point.y}%;"></div>
        <div class="map-label" style="left:${point.x}%;top:${point.y}%;">${escapeHtml(row.destination || row.pickup || "Request")}</div>
      `;
    }).join("");

    const rideMarkup = filtered.rides.slice(0, 6).map((row, index) => {
      const point = inferLocation(row.destination || row.pickup, index + 11);
      const dx = point.x - airport.x;
      const dy = point.y - airport.y;
      const length = Math.sqrt((dx * dx) + (dy * dy));
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return `
        <div class="map-route ride" style="left:${airport.x}%;top:${airport.y}%;width:${length}%;transform:rotate(${angle}deg);"></div>
        <div class="map-node ride" style="left:${point.x}%;top:${point.y}%;"></div>
      `;
    }).join("");

    const driverMarkup = filtered.drivers.slice(0, 8).map((row, index) => {
      const anchor = filtered.rides[index] ? inferLocation(filtered.rides[index].destination || filtered.rides[index].pickup, index + 20) : airport;
      const point = {
        x: Math.min(90, anchor.x + ((index % 3) * 3) - 3),
        y: Math.min(86, anchor.y + ((index % 4) * 2) - 4),
      };
      return `
        <div class="map-node driver" style="left:${point.x}%;top:${point.y}%;"></div>
        <div class="map-label" style="left:${point.x}%;top:${point.y}%;">${escapeHtml(row.fullName || "Driver")}</div>
      `;
    }).join("");

    panels.opsMap.innerHTML = `
      <div class="map-node airport" style="left:${airport.x}%;top:${airport.y}%;"></div>
      <div class="map-label" style="left:${airport.x}%;top:${airport.y}%;">Airport Hub</div>
      ${requestMarkup}
      ${rideMarkup}
      ${driverMarkup}
    `;
  }

  function updateMeta(data, filtered, overview) {
    lastSyncLabel.textContent = formatDate(data.fetchedAt);
    loadedRowsLabel.textContent = String(
      (data.recentUsers || []).length +
      (data.rideRequests || []).length +
      (data.rides || []).length +
      (data.walletTransactions || []).length +
      (data.deposits || []).length +
      (data.events || []).length
    );
    ridesTodayPill.textContent = `${overview.ridesToday} rides today`;

    if (overview.pendingRequests > overview.activeRides) {
      opsPulseLabel.textContent = "Demand heavy";
    } else if (filtered.complaints.length > 2) {
      opsPulseLabel.textContent = "Support pressure";
    } else if (overview.ridesToday > 0) {
      opsPulseLabel.textContent = "Healthy flow";
    } else {
      opsPulseLabel.textContent = "Quiet";
    }
  }

  function renderDashboard() {
    if (!state.dashboard) return;
    const filtered = applyFilters(state.dashboard);
    const overview = deriveOverview(state.dashboard, filtered);

    renderSummary(state.dashboard.summary || {}, overview);
    updateMeta(state.dashboard, filtered, overview);

    renderBarChart(panels.ridesBarChart, [
      { label: "Requests", value: overview.requestsToday },
      { label: "Rides", value: overview.ridesToday },
      { label: "Completed", value: overview.completedToday },
      { label: "Cancelled", value: overview.cancelledToday },
      { label: "Signups", value: overview.signupsToday },
    ], "#38bdf8");

    renderPieChart(panels.rolePieChart, [
      { label: "Passengers", value: toNum(state.dashboard.summary.passengersTotal), color: "#38bdf8" },
      { label: "Drivers", value: toNum(state.dashboard.summary.driversTotal), color: "#2dd4bf" },
      { label: "Admins", value: Math.max(0, toNum(state.dashboard.summary.usersTotal) - toNum(state.dashboard.summary.passengersTotal) - toNum(state.dashboard.summary.driversTotal)), color: "#f59e0b" },
    ]);

    renderBarChart(panels.paymentsBarChart, [
      {
        label: "Deposits",
        value: filtered.deposits.reduce((sum, row) => sum + toNum(row.amount), 0),
      },
      {
        label: "Credits",
        value: filtered.walletTransactions.filter((row) => normalize(row.transactionType) === "credit").reduce((sum, row) => sum + toNum(row.amount), 0),
      },
      {
        label: "Debits",
        value: filtered.walletTransactions.filter((row) => normalize(row.transactionType) === "debit").reduce((sum, row) => sum + toNum(row.amount), 0),
      },
      {
        label: "Ride Value",
        value: filtered.rides.reduce((sum, row) => sum + toNum(row.fare), 0),
      },
    ], "#2dd4bf");

    renderSignalFeed(panels.signupFeed, filtered.recentUsers
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6)
      .map((row) => ({
        title: `${row.fullName || "User"} joined as ${row.role || "user"}`,
        body: `${row.phone || "-"} created at ${formatDate(row.createdAt)} with wallet ${formatNaira(row.walletBalance)}`,
      })), "No new signups in the selected window.");

    const exceptions = [
      ...filtered.complaints.map((row) => ({
        title: `Complaint: ${row.eventName || "support event"}`,
        body: `${row.user?.fullName || "Unknown user"} at ${formatDate(row.createdAt)}`,
      })),
      ...filtered.rides.filter((row) => normalize(row.status) === "cancelled").map((row) => ({
        title: `Cancelled ride from ${row.pickup || "-"} to ${row.destination || "-"}`,
        body: `${row.cancelledBy || "Unknown party"} cancelled at ${formatDate(row.tripEndedAt || row.createdAt)}.`,
      })),
    ].slice(0, 8);
    renderSignalFeed(panels.exceptionsFeed, exceptions, "No complaints or cancellations in the selected window.");

    renderOpsMap(filtered);
    renderUsers(filtered.recentUsers);
    renderDrivers(filtered.drivers);
    renderRequests(filtered.rideRequests);
    renderRides(filtered.rides);
    renderTransactions(filtered.walletTransactions);
    renderDeposits(filtered.deposits);
    renderEvents(filtered.events);
  }

  function setActiveTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tabName);
    });
    document.querySelectorAll(".dashboard-tab").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
    });
  }

  function configureAutoRefresh() {
    if (state.autoRefreshId) {
      clearInterval(state.autoRefreshId);
      state.autoRefreshId = null;
    }
    const interval = toNum(refreshIntervalInput.value, 0);
    localStorage.setItem(storage.refreshInterval, String(interval));
    if (!interval) return;
    state.autoRefreshId = setInterval(() => {
      if (keyInput.value.trim()) loadDashboard(true);
    }, interval);
  }

  async function loadDashboard(silent) {
    const backendUrl = getBackendUrl();
    const adminKey = keyInput.value.trim();
    if (!backendUrl || !adminKey) {
      setStatus("Backend URL and admin key are required.", "error");
      setLiveState("error", "Missing creds");
      return;
    }

    connectBtn.disabled = true;
    refreshBtn.disabled = true;
    if (!silent) {
      setStatus("Loading Poolily ops console...", "");
    }
    setLiveState("idle", "Syncing");
    localStorage.setItem(storage.backendUrl, backendUrl);

    try {
      const data = await adminRequest("getAdminDashboard", { adminKey, limit: 100 });
      state.dashboard = data;
      renderDashboard();
      configureAutoRefresh();
      setStatus("Dashboard synced successfully.", "success");
      setLiveState("live", "Live");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load admin dashboard.", "error");
      setLiveState("error", "Error");
    } finally {
      connectBtn.disabled = false;
      refreshBtn.disabled = false;
    }
  }

  backendInput.value = getBackendUrl();
  refreshIntervalInput.value = localStorage.getItem(storage.refreshInterval) || refreshIntervalInput.value;

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  [timeFilter, searchFilter, rideStatusFilter, roleFilter, sortFilter].forEach((input) => {
    input.addEventListener("input", renderDashboard);
    input.addEventListener("change", renderDashboard);
  });

  refreshIntervalInput.addEventListener("change", configureAutoRefresh);
  connectBtn.addEventListener("click", () => loadDashboard(false));
  refreshBtn.addEventListener("click", () => loadDashboard(false));
  setActiveTab("overview");
})();

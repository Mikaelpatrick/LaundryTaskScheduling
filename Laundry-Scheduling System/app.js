(() => {
  "use strict";

  const STORAGE_KEY = "laundry_scheduler_state_v5";
  const PRICE_PER_KG = 33;
  const MAX_KG_PER_LOAD = 6;

  const defaultMachines = () => [
    { id: 1, name: "Washer 1", type: "Washer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 2, name: "Washer 2", type: "Washer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 3, name: "Washer 3", type: "Washer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 4, name: "Washer 4", type: "Washer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 5, name: "Dryer 1", type: "Dryer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 6, name: "Dryer 2", type: "Dryer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 7, name: "Dryer 3", type: "Dryer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
    { id: 8, name: "Dryer 4", type: "Dryer", status: "Available", currentTaskId: null, dailyUsageCount: 0, lastUsedAt: 0 },
  ];

  const defaultState = () => ({
    nextTaskId: 101,
    nextOrderNum: 1001,
    nextLogId: 1,
    waitThresholdSec: 20,
    soundEnabled: true,
    taskFilter: "Washing",
    activeView: "board",
    searchQuery: "",
    employees: [
      { id: 1, name: "Employee 1", status: "Available", shiftState: "On Shift", dailyTaskCount: 0, lastFinishedAt: 0, activeTaskId: null },
      { id: 2, name: "Employee 2", status: "Available", shiftState: "On Shift", dailyTaskCount: 0, lastFinishedAt: 0, activeTaskId: null },
      { id: 3, name: "Employee 3", status: "Available", shiftState: "On Shift", dailyTaskCount: 0, lastFinishedAt: 0, activeTaskId: null },
    ],
    machines: defaultMachines(),
    orders: [],
    tasks: [],
    washerQueue: [],
    dryerQueue: [],
    employeeQueue: [],
    activityLog: [],
  });

  let state = loadState();
  let overrideTargetTaskId = null;

  // DOM Elements
  const sidebarEmployees = document.getElementById("sidebar-employees");
  const sidebarMachines = document.getElementById("sidebar-machines");
  const tasksGrid = document.getElementById("tasks-grid");
  const employeesGrid = document.getElementById("employees-grid");
  const washersGrid = document.getElementById("washers-grid");
  const dryersGrid = document.getElementById("dryers-grid");
  const washerQueueList = document.getElementById("washer-queue-list");
  const dryerQueueList = document.getElementById("dryer-queue-list");
  const employeeQueueList = document.getElementById("employee-queue-list");
  const queueCountBadge = document.getElementById("queue-count");
  const washerQueueCount = document.getElementById("washer-queue-count");
  const dryerQueueCount = document.getElementById("dryer-queue-count");
  const employeeQueueCount = document.getElementById("employee-queue-count");
  const ordersGrid = document.getElementById("orders-grid");
  const reportsKpis = document.getElementById("reports-kpis");
  const reportsBreakdown = document.getElementById("reports-breakdown");
  const activityLogBody = document.getElementById("activity-log-body");
  const logCountBadge = document.getElementById("log-count");
  const searchInput = document.getElementById("search-input");
  const waitThresholdInput = document.getElementById("wait-threshold");
  const soundToggleBtn = document.getElementById("btn-sound-toggle");
  const bellDot = document.getElementById("bell-dot");
  const alertBanner = document.getElementById("supervisor-alert-banner");
  const alertText = document.getElementById("supervisor-alert-text");
  const toastContainer = document.getElementById("toast-container");

  // Filter Count Pills & Board Create Button
  const boardHeading = document.getElementById("board-heading");
  const boardSubtitle = document.getElementById("board-subtitle");
  const btnOpenCreate = document.getElementById("btn-open-create");
  const countPending = document.getElementById("count-pending");
  const countWashing = document.getElementById("count-washing");
  const countDrying = document.getElementById("count-drying");
  const countFolding = document.getElementById("count-folding");
  const countCompleted = document.getElementById("count-completed");

  // Create Modal
  const createModal = document.getElementById("create-modal");
  const taskForm = document.getElementById("task-form");
  const orderNumberInput = document.getElementById("order-number");
  const customerNameInput = document.getElementById("customer-name");
  const taskTitleInput = document.getElementById("task-title");
  const taskDetailsInput = document.getElementById("task-details");
  const taskKgInput = document.getElementById("task-kg");
  const createdBySelect = document.getElementById("created-by");
  const addonFeeInput = document.getElementById("addon-fee");
  const isRushCheckbox = document.getElementById("is-rush");
  const summaryLoads = document.getElementById("summary-loads");
  const summaryPrice = document.getElementById("summary-price");

  // Override Modal
  const overrideModal = document.getElementById("override-modal");
  const overrideTaskInfo = document.getElementById("override-task-info");
  const overrideEmployeeGroup = document.getElementById("override-employee-group");
  const overrideEmployeeSelect = document.getElementById("override-employee");
  const overrideMachineGroup = document.getElementById("override-machine-group");
  const overrideMachineSelect = document.getElementById("override-machine");
  const overrideReasonInput = document.getElementById("override-reason");

  // Receipt Modal
  const receiptModal = document.getElementById("receipt-modal");
  const receiptBody = document.getElementById("receipt-body");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {
      // Ignore storage errors
    }
    return defaultState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Ignore quota errors
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTime(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString();
  }

  function formatPeso(amount) {
    return `₱${Number(amount).toFixed(2)}`;
  }

  function playChime(type = "info") {
    if (!state.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = type === "warning" ? 440 : 660;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (_) {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }

  function splitIntoLoads(totalKg) {
    const kg = Math.max(0.5, Number(totalKg) || 6);
    const loads = [];
    let remaining = kg;
    while (remaining > 0) {
      const chunk = Math.min(MAX_KG_PER_LOAD, Number(remaining.toFixed(2)));
      loads.push(chunk);
      remaining = Number((remaining - chunk).toFixed(2));
    }
    return loads;
  }

  function updateOrderSummary() {
    const kg = Math.max(0.5, Number(taskKgInput.value) || 0);
    const addon = Math.max(0, Number(addonFeeInput.value) || 0);
    const loads = splitIntoLoads(kg);
    const breakdown = loads.map((l) => `${l} kg`).join(" + ");
    summaryLoads.textContent = `${loads.length} load${loads.length > 1 ? "s" : ""} (${breakdown})`;
    summaryPrice.textContent = formatPeso(kg * PRICE_PER_KG + addon);
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    bellDot.classList.remove("hidden");
    playChime(type);
    setTimeout(() => toast.remove(), 4500);
  }

  function getEmployee(id) {
    return state.employees.find((e) => e.id === Number(id));
  }

  function getMachine(id) {
    return state.machines.find((m) => m.id === Number(id));
  }

  function getTask(id) {
    return state.tasks.find((t) => t.id === Number(id));
  }

  function getOrder(orderNumber) {
    return state.orders.find((o) => o.orderNumber === orderNumber);
  }

  // Fair Selection Helpers
  function getEligibleEmployees() {
    return state.employees.filter(
      (e) => e.status === "Available" && e.shiftState === "On Shift"
    );
  }

  function selectFairEmployee() {
    const eligible = getEligibleEmployees();
    if (eligible.length === 0) return null;
    return [...eligible].sort((a, b) => {
      if (a.dailyTaskCount !== b.dailyTaskCount) return a.dailyTaskCount - b.dailyTaskCount;
      if (a.lastFinishedAt !== b.lastFinishedAt) return a.lastFinishedAt - b.lastFinishedAt;
      return a.id - b.id;
    })[0];
  }

  function selectFairMachine(type) {
    const available = state.machines.filter(
      (m) => m.type === type && m.status === "Available"
    );
    if (available.length === 0) return null;
    return [...available].sort((a, b) => {
      if (a.dailyUsageCount !== b.dailyUsageCount) return a.dailyUsageCount - b.dailyUsageCount;
      if (a.lastUsedAt !== b.lastUsedAt) return a.lastUsedAt - b.lastUsedAt;
      return a.id - b.id;
    })[0];
  }

  function addLog(task, stage, empId, machineId, notes) {
    state.activityLog.unshift({
      logId: state.nextLogId++,
      taskId: task.id,
      taskTitle: `${task.orderNumber} — ${task.title}`,
      stage,
      employeeId: empId,
      machineId,
      startTime: Date.now(),
      finishTime: null,
      notes,
    });
  }

  function closeOpenLog(taskId, stage, noteSuffix) {
    const log = state.activityLog.find(
      (l) => l.taskId === taskId && l.stage === stage && l.finishTime === null
    );
    if (log) {
      log.finishTime = Date.now();
      if (noteSuffix) {
        log.notes = log.notes ? `${log.notes} | ${noteSuffix}` : noteSuffix;
      }
    }
  }

  function enqueue(queueArr, taskId, stage, front = false) {
    if (queueArr.some((q) => q.taskId === taskId)) return;
    const entry = {
      taskId,
      stage,
      enqueuedAt: Date.now(),
      priorityPosition: front ? 0 : 1,
      supervisorAlerted: false,
    };
    if (front) queueArr.unshift(entry);
    else queueArr.push(entry);
  }

  // Stage 1: Washing
  function tryStartWashing(task, frontOnWait = false) {
    const priority = frontOnWait || task.isRush;
    const washer = selectFairMachine("Washer");
    if (!washer) {
      enqueue(state.washerQueue, task.id, "WASH", priority);
      showToast(`All 4 washers busy. Task #${task.id} added to Washer Queue.`, "warning");
      return;
    }

    const emp = selectFairEmployee();
    if (!emp) {
      enqueue(state.employeeQueue, task.id, "WASH", priority);
      showToast(`All 3 employees busy. Task #${task.id} added to Employee Queue.`, "warning");
      return;
    }

    task.status = "Washing";
    task.assignedMachineId = washer.id;
    task.assignedEmployeeId = emp.id;

    washer.status = "In Use";
    washer.currentTaskId = task.id;
    washer.dailyUsageCount += 1;

    emp.dailyTaskCount += 1;
    emp.lastFinishedAt = Date.now();

    addLog(task, "WASH", emp.id, washer.id, `Loaded ${task.loadKg} kg into ${washer.name}; employee released`);
    showToast(`Notification to ${emp.name}: Load ${task.orderNumber} (#${task.id}) into ${washer.name}.`, "success");
  }

  // Stage 2: Drying
  function tryStartDrying(task, frontOnWait = false) {
    const priority = frontOnWait || task.isRush;
    const dryer = selectFairMachine("Dryer");
    if (!dryer) {
      enqueue(state.dryerQueue, task.id, "DRY", priority);
      showToast(`All 4 dryers busy. Task #${task.id} added to Dryer Queue.`, "warning");
      return;
    }

    const emp = selectFairEmployee();
    if (!emp) {
      enqueue(state.employeeQueue, task.id, "DRY", priority);
      showToast(`All 3 employees busy. Task #${task.id} waiting for transfer to Dryer.`, "warning");
      return;
    }

    task.status = "Drying";
    task.assignedMachineId = dryer.id;
    task.assignedEmployeeId = emp.id;

    dryer.status = "In Use";
    dryer.currentTaskId = task.id;
    dryer.dailyUsageCount += 1;

    emp.dailyTaskCount += 1;
    emp.lastFinishedAt = Date.now();

    addLog(task, "DRY", emp.id, dryer.id, `Transferred ${task.loadKg} kg to ${dryer.name}; employee released`);
    showToast(`Notification to ${emp.name}: Move ${task.orderNumber} (#${task.id}) to ${dryer.name}.`, "success");
  }

  // Stage 3: Folding / Packing
  function tryStartFolding(task, frontOnWait = false) {
    const priority = frontOnWait || task.isRush;
    const emp = selectFairEmployee();
    if (!emp) {
      enqueue(state.employeeQueue, task.id, "FOLD", priority);
      showToast(`All 3 employees busy. Task #${task.id} waiting in Employee Queue for folding.`, "warning");
      return;
    }

    task.status = "Folding/Packing";
    task.assignedMachineId = null;
    task.assignedEmployeeId = emp.id;

    emp.status = "Unavailable";
    emp.activeTaskId = task.id;
    emp.dailyTaskCount += 1;

    addLog(task, "FOLD", emp.id, null, `${emp.name} folding & packing (${task.loadKg} kg)`);
    showToast(`Notification to ${emp.name}: Fold & pack ${task.orderNumber} (#${task.id}).`, "success");
  }

  function finishMachineStage(machineId) {
    const machine = getMachine(machineId);
    if (!machine || machine.status !== "In Use" || !machine.currentTaskId) return;

    const task = getTask(machine.currentTaskId);
    const completedStage = machine.type === "Washer" ? "WASH" : "DRY";

    closeOpenLog(task.id, completedStage, `${machine.name} finished`);

    machine.status = "Available";
    machine.currentTaskId = null;
    machine.lastUsedAt = Date.now();

    showToast(`${machine.name} finished Task #${task.id} and is now Available.`, "info");

    if (machine.type === "Washer" && state.washerQueue.length > 0) {
      const nextEntry = state.washerQueue.shift();
      const nextTask = getTask(nextEntry.taskId);
      if (nextTask) tryStartWashing(nextTask);
    } else if (machine.type === "Dryer" && state.dryerQueue.length > 0) {
      const nextEntry = state.dryerQueue.shift();
      const nextTask = getTask(nextEntry.taskId);
      if (nextTask) tryStartDrying(nextTask);
    }

    if (task) {
      task.assignedMachineId = null;
      if (completedStage === "WASH") {
        tryStartDrying(task);
        if (state.activeView === "board") state.taskFilter = "Drying";
      } else {
        tryStartFolding(task);
        if (state.activeView === "board") state.taskFilter = "Folding/Packing";
      }
    }

    saveState();
    render();
  }

  function dispatchFromEmployeeQueue() {
    if (state.employeeQueue.length === 0) return;
    if (getEligibleEmployees().length === 0) return;

    const nextEntry = state.employeeQueue.shift();
    const task = getTask(nextEntry.taskId);
    if (!task) return;

    if (nextEntry.stage === "WASH") tryStartWashing(task);
    else if (nextEntry.stage === "DRY") tryStartDrying(task);
    else tryStartFolding(task);
  }

  function createOrderAndScheduleTasks(customerName, title, details, totalKg, addonFee, isRush, createdById) {
    const orderNumber = `ORD-${state.nextOrderNum++}`;
    const loads = splitIntoLoads(totalKg);
    const addon = Math.max(0, Number(addonFee) || 0);
    const orderTotalPrice = Number(totalKg) * PRICE_PER_KG + addon;

    const order = {
      orderNumber,
      customerName: customerName.trim(),
      title: title.trim(),
      details: details.trim(),
      totalKg: Number(totalKg),
      totalLoads: loads.length,
      addonFee: addon,
      totalPrice: orderTotalPrice,
      isPaid: false,
      isRush: Boolean(isRush),
      createdAt: Date.now(),
      taskIds: [],
    };

    loads.forEach((loadKg, idx) => {
      const task = {
        id: state.nextTaskId++,
        orderNumber,
        customerName: order.customerName,
        title: order.title,
        details: order.details,
        loadNumber: idx + 1,
        totalLoads: loads.length,
        loadKg,
        loadPrice: loadKg * PRICE_PER_KG,
        orderTotalKg: order.totalKg,
        orderTotalPrice,
        isRush: order.isRush,
        status: "Pending",
        assignedEmployeeId: null,
        assignedMachineId: null,
        createdByEmployeeId: Number(createdById),
        createdAt: Date.now(),
        completedAt: null,
      };
      order.taskIds.push(task.id);
      state.tasks.unshift(task);
      tryStartWashing(task);
    });

    state.orders.unshift(order);

    if (loads.length > 1) {
      showToast(
        `${orderNumber} (${totalKg} kg) split into ${loads.length} loads (max 6 kg/load). Total: ${formatPeso(orderTotalPrice)}.`,
        "info"
      );
    }

    saveState();
    render();
  }

  function completeFoldingTask(employeeId) {
    const emp = getEmployee(employeeId);
    if (!emp || !emp.activeTaskId) return;

    const task = getTask(emp.activeTaskId);
    if (!task) return;

    const now = Date.now();
    task.status = "Completed";
    task.completedAt = now;
    closeOpenLog(task.id, "FOLD", "Completed");

    emp.activeTaskId = null;
    emp.lastFinishedAt = now;
    emp.status = "Available";

    showToast(`${emp.name} completed ${task.orderNumber} (#${task.id})!`, "success");
    if (state.activeView === "board") state.taskFilter = "Completed";
    dispatchFromEmployeeQueue();

    if (state.employeeQueue.length === 0) {
      alertBanner.classList.add("hidden");
    }

    saveState();
    render();
  }

  function handleShiftChange(employeeId, newShiftState) {
    const emp = getEmployee(employeeId);
    if (!emp) return;
    emp.shiftState = newShiftState;
    if (newShiftState === "On Shift" && emp.status === "Available") {
      dispatchFromEmployeeQueue();
    }
    saveState();
    render();
  }

  function handleEmployeeOfflineMidTask(employeeId) {
    const emp = getEmployee(employeeId);
    if (!emp || !emp.activeTaskId) return;
    const task = getTask(emp.activeTaskId);
    if (!task) return;

    closeOpenLog(task.id, "FOLD", `Interrupted: ${emp.name} went offline`);
    emp.activeTaskId = null;
    emp.status = "Available";
    emp.shiftState = "Off Shift";

    task.assignedEmployeeId = null;
    tryStartFolding(task, true);

    saveState();
    render();
  }

  function toggleMachineOutOfService(machineId) {
    const machine = getMachine(machineId);
    if (!machine) return;

    if (machine.status === "Out of Service") {
      machine.status = "Available";
      showToast(`${machine.name} restored to Available.`, "success");
      if (machine.type === "Washer" && state.washerQueue.length > 0) {
        const next = state.washerQueue.shift();
        const t = getTask(next.taskId);
        if (t) tryStartWashing(t);
      } else if (machine.type === "Dryer" && state.dryerQueue.length > 0) {
        const next = state.dryerQueue.shift();
        const t = getTask(next.taskId);
        if (t) tryStartDrying(t);
      }
    } else if (machine.status === "Available") {
      machine.status = "Out of Service";
      showToast(`${machine.name} marked Out of Service.`, "warning");
    } else if (machine.status === "In Use") {
      const task = getTask(machine.currentTaskId);
      const stage = machine.type === "Washer" ? "WASH" : "DRY";
      machine.status = "Out of Service";
      machine.currentTaskId = null;

      if (task) {
        closeOpenLog(task.id, stage, `Breakdown: ${machine.name} Out of Service`);
        task.assignedMachineId = null;
        showToast(`${machine.name} broke down! Reassigning Task #${task.id}.`, "warning");
        if (stage === "WASH") tryStartWashing(task, true);
        else tryStartDrying(task, true);
      }
    }

    saveState();
    render();
  }

  function toggleOrderPaid(orderNumber) {
    const order = getOrder(orderNumber);
    if (!order) return;
    order.isPaid = !order.isPaid;
    showToast(`${order.orderNumber} marked as ${order.isPaid ? "Paid" : "Unpaid"}.`, "info");
    saveState();
    render();
  }

  function openReceiptModal(orderNumber) {
    const order = getOrder(orderNumber);
    if (!order) return;
    const baseAmount = order.totalKg * PRICE_PER_KG;

    receiptBody.innerHTML = `
      <div class="receipt-center">
        <strong>WASH 'N' DRY LAUNDRY SERVICES</strong><br/>
        <span>Official Claim Stub &amp; Receipt</span>
      </div>
      <div class="receipt-line"></div>
      <div class="receipt-row"><span>Order No:</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
      <div class="receipt-row"><span>Customer:</span><strong>${escapeHtml(order.customerName)}</strong></div>
      <div class="receipt-row"><span>Date:</span><span>${formatDateTime(order.createdAt)}</span></div>
      <div class="receipt-line"></div>
      <div class="receipt-row"><span>Service:</span><span>${escapeHtml(order.title)}</span></div>
      <div class="receipt-row"><span>Weight (${order.totalLoads} load${order.totalLoads > 1 ? "s" : ""}):</span><span>${order.totalKg} kg x ${formatPeso(PRICE_PER_KG)}</span></div>
      <div class="receipt-row"><span>Laundry Subtotal:</span><span>${formatPeso(baseAmount)}</span></div>
      ${order.addonFee > 0 ? `<div class="receipt-row"><span>Add-on Fee:</span><span>${formatPeso(order.addonFee)}</span></div>` : ""}
      <div class="receipt-line"></div>
      <div class="receipt-row"><strong>TOTAL:</strong><strong>${formatPeso(order.totalPrice)}</strong></div>
      <div class="receipt-row"><span>Payment Status:</span><strong>${order.isPaid ? "PAID" : "UNPAID"}</strong></div>
      <div class="receipt-line"></div>
      <div class="receipt-center" style="font-size:0.75rem;">
        Thank you for trusting Wash 'N' Dry!<br/>
        Please present this stub upon pickup.
      </div>
    `;
    receiptModal.classList.remove("hidden");
  }

  function exportCsv(filename, headers, rows) {
    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function endOfDayReset() {
    state.employees.forEach((e) => { e.dailyTaskCount = 0; });
    state.machines.forEach((m) => { m.dailyUsageCount = 0; });
    showToast("Daily employee and machine counters reset for a new shift.", "info");
    saveState();
    render();
  }

  // Supervisor Manual Override
  function openOverrideModal(taskId) {
    const task = getTask(taskId);
    if (!task || task.status === "Completed" || task.status === "Pending") return;

    overrideTargetTaskId = task.id;
    overrideTaskInfo.textContent = `${task.orderNumber} (#${task.id}): "${task.title}" (Stage: ${task.status})`;

    const isMachineStage = task.status === "Washing" || task.status === "Drying";
    overrideEmployeeGroup.classList.toggle("hidden", isMachineStage);
    overrideMachineGroup.classList.toggle("hidden", !isMachineStage);

    if (isMachineStage) {
      const mType = task.status === "Washing" ? "Washer" : "Dryer";
      const candidates = state.machines.filter((m) => m.type === mType && m.status !== "Out of Service");
      overrideMachineSelect.innerHTML = candidates
        .map((m) => `<option value="${m.id}">${m.name} (${m.status})</option>`)
        .join("");
      if (task.assignedMachineId) overrideMachineSelect.value = String(task.assignedMachineId);
    } else {
      overrideEmployeeSelect.value = String(
        state.employees.find((e) => e.id !== task.assignedEmployeeId)?.id || 1
      );
    }

    overrideModal.classList.remove("hidden");
  }

  function confirmOverride() {
    const task = getTask(overrideTargetTaskId);
    const reason = overrideReasonInput.value.trim() || "Supervisor manual override";
    if (!task) {
      overrideModal.classList.add("hidden");
      return;
    }

    if (task.status === "Washing" || task.status === "Drying") {
      const newMachine = getMachine(overrideMachineSelect.value);
      const oldMachine = getMachine(task.assignedMachineId);
      if (!newMachine || newMachine.id === oldMachine?.id) {
        overrideModal.classList.add("hidden");
        return;
      }
      if (newMachine.status === "In Use") {
        showToast(`${newMachine.name} is currently In Use. Pick an Available machine.`, "warning");
        return;
      }

      const stage = task.status === "Washing" ? "WASH" : "DRY";
      if (oldMachine) {
        oldMachine.status = "Available";
        oldMachine.currentTaskId = null;
      }
      closeOpenLog(task.id, stage, `Overridden to ${newMachine.name}: ${reason}`);

      task.assignedMachineId = newMachine.id;
      newMachine.status = "In Use";
      newMachine.currentTaskId = task.id;
      newMachine.dailyUsageCount += 1;

      addLog(task, stage, task.assignedEmployeeId, newMachine.id, `Manual Override: ${reason}`);
      showToast(`Task #${task.id} moved to ${newMachine.name}.`, "success");
    } else if (task.status === "Folding/Packing") {
      const newEmp = getEmployee(overrideEmployeeSelect.value);
      const oldEmp = getEmployee(task.assignedEmployeeId);
      if (!newEmp || newEmp.id === oldEmp?.id) {
        overrideModal.classList.add("hidden");
        return;
      }

      if (oldEmp) {
        closeOpenLog(task.id, "FOLD", `Overridden to ${newEmp.name}: ${reason}`);
        oldEmp.activeTaskId = null;
        oldEmp.status = "Available";
      }

      if (newEmp.activeTaskId) {
        const displaced = getTask(newEmp.activeTaskId);
        if (displaced) {
          closeOpenLog(displaced.id, "FOLD", "Displaced by supervisor override");
          displaced.assignedEmployeeId = null;
          enqueue(state.employeeQueue, displaced.id, "FOLD", true);
        }
        newEmp.activeTaskId = null;
        newEmp.status = "Available";
      }

      if (newEmp.shiftState !== "On Shift") newEmp.shiftState = "On Shift";

      task.assignedEmployeeId = newEmp.id;
      newEmp.status = "Unavailable";
      newEmp.activeTaskId = task.id;
      newEmp.dailyTaskCount += 1;

      addLog(task, "FOLD", newEmp.id, null, `Manual Override: ${reason}`);
      showToast(`Notification to ${newEmp.name}: Task #${task.id} reassigned to you.`, "success");
    }

    overrideModal.classList.add("hidden");
    overrideTargetTaskId = null;
    saveState();
    render();
  }

  function checkSupervisorAlert() {
    if (state.employeeQueue.length > 0 && getEligibleEmployees().length === 0) {
      const thresholdMs = (Number(state.waitThresholdSec) || 20) * 1000;
      const oldest = state.employeeQueue[0];
      if (Date.now() - oldest.enqueuedAt >= thresholdMs && !oldest.supervisorAlerted) {
        oldest.supervisorAlerted = true;
        alertText.textContent = `All 3 employees have been unavailable for over ${state.waitThresholdSec}s. ${state.employeeQueue.length} task(s) waiting.`;
        alertBanner.classList.remove("hidden");
        showToast("Supervisor Alert: All employees busy too long!", "warning");
        saveState();
      }
    }
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll(".rail-btn[data-view]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    ["board", "employees", "machines", "queue", "orders", "reports", "log"].forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.toggle("hidden", v !== viewName);
    });
    if (viewName === "log") bellDot.classList.add("hidden");
    saveState();
  }

  // Rendering
  function renderSidebar() {
    if (state.taskFilter === "all") state.taskFilter = "Washing";
    countPending.textContent = state.tasks.filter((t) => t.status === "Pending").length;
    countWashing.textContent = state.tasks.filter((t) => t.status === "Washing").length;
    countDrying.textContent = state.tasks.filter((t) => t.status === "Drying").length;
    countFolding.textContent = state.tasks.filter((t) => t.status === "Folding/Packing").length;
    countCompleted.textContent = state.tasks.filter((t) => t.status === "Completed").length;

    document.querySelectorAll("#sidebar-filters .filter-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.filter === state.taskFilter);
    });

    sidebarEmployees.innerHTML = state.employees
      .map((emp) => {
        let dotClass = emp.status === "Available" ? "dot-available" : "dot-unavailable";
        let tag = emp.status;
        if (emp.shiftState !== "On Shift") {
          dotClass = "dot-skipped";
          tag = emp.shiftState;
        }
        return `
          <div class="side-emp-row">
            <div class="side-emp-left">
              <span class="status-dot ${dotClass}"></span>
              <span>${escapeHtml(emp.name)}</span>
            </div>
            <span class="side-emp-tag">${tag}</span>
          </div>
        `;
      })
      .join("");

    const washersFree = state.machines.filter((m) => m.type === "Washer" && m.status === "Available").length;
    const dryersFree = state.machines.filter((m) => m.type === "Dryer" && m.status === "Available").length;
    sidebarMachines.innerHTML = `
      <div class="side-emp-row">
        <div class="side-emp-left">
          <span class="status-dot ${washersFree > 0 ? "dot-available" : "dot-unavailable"}"></span>
          <span>Washers</span>
        </div>
        <span class="side-emp-tag">${washersFree}/4 Free</span>
      </div>
      <div class="side-emp-row">
        <div class="side-emp-left">
          <span class="status-dot ${dryersFree > 0 ? "dot-available" : "dot-unavailable"}"></span>
          <span>Dryers</span>
        </div>
        <span class="side-emp-tag">${dryersFree}/4 Free</span>
      </div>
    `;
  }

  function renderTaskCard(task) {
    const emp = task.assignedEmployeeId ? getEmployee(task.assignedEmployeeId) : null;
    const machine = task.assignedMachineId ? getMachine(task.assignedMachineId) : null;

    let accentClass = "accent-pending";
    let pillClass = "pill-bg-pending";
    if (task.status === "Washing") { accentClass = "accent-washing"; pillClass = "pill-bg-washing"; }
    else if (task.status === "Drying") { accentClass = "accent-drying"; pillClass = "pill-bg-drying"; }
    else if (task.status === "Folding/Packing") { accentClass = "accent-folding"; pillClass = "pill-bg-folding"; }
    else if (task.status === "Completed") { accentClass = "accent-completed"; pillClass = "pill-bg-completed"; }

    let actionsHtml = "";
    if (task.status === "Folding/Packing" && emp) {
      actionsHtml = `
        <button class="btn btn-success btn-small" data-action="complete" data-emp="${emp.id}">Complete</button>
        <button class="btn btn-soft btn-small" data-action="override" data-task="${task.id}">Override</button>
        <button class="btn btn-danger btn-small" data-action="offline" data-emp="${emp.id}">Offline</button>
      `;
    } else if ((task.status === "Washing" || task.status === "Drying") && machine) {
      actionsHtml = `
        <button class="btn btn-success btn-small" data-action="finish-machine" data-machine="${machine.id}">Done</button>
        <button class="btn btn-soft btn-small" data-action="override" data-task="${task.id}">Override</button>
        <button class="btn btn-danger btn-small" data-action="breakdown" data-machine="${machine.id}">Breakdown</button>
      `;
    }

    return `
      <article class="task-card ${accentClass}">
        <div>
          <div class="card-top-row">
            <div style="display:flex; gap:6px; align-items:center;">
              <span class="category-pill ${pillClass}">${task.status}</span>
              ${task.isRush ? `<span class="rush-badge">RUSH</span>` : ""}
            </div>
            <span class="price-badge">${formatPeso(task.loadPrice)}</span>
          </div>
          <div class="card-body" style="margin-top:10px;">
            <div class="task-id-label" style="margin-bottom:4px;">
              <strong>${escapeHtml(task.orderNumber)}</strong> • ${escapeHtml(task.customerName)}
            </div>
            <h3>#${task.id} — ${escapeHtml(task.title)}</h3>
            <p>${escapeHtml(task.details)}</p>
            <div class="task-id-label" style="margin-top:6px;">
              Load ${task.loadNumber}/${task.totalLoads}: <strong>${task.loadKg} kg</strong>
              ${task.totalLoads > 1 ? ` (Order Total: ${task.orderTotalKg} kg • ${formatPeso(task.orderTotalPrice)})` : ""}
            </div>
          </div>
        </div>
        <div>
          ${actionsHtml ? `<div class="card-actions-bar" style="margin-bottom:10px;">${actionsHtml}</div>` : ""}
          <div class="card-footer">
            <div class="card-meta-left">
              ${machine ? `<strong>${machine.name}</strong>` : "No machine"} • ${formatTime(task.createdAt)}
            </div>
            <div class="card-assignee-right">
              ${emp ? `<span class="avatar avatar-emp-${emp.id}" title="${escapeHtml(emp.name)}">E${emp.id}</span>` : ""}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderBoard() {
    const headerMap = {
      Washing: { title: "Wash", sub: "Assigned to Washer 1–4" },
      Drying: { title: "Dry", sub: "Assigned to Dryer 1–4" },
      "Folding/Packing": { title: "Folding", sub: "Assigned to Employee 1–3" },
      Pending: { title: "Pending", sub: "Waiting in FCFS Queue" },
      Completed: { title: "Completed", sub: "Finished laundry loads" },
    };
    const meta = headerMap[state.taskFilter] || headerMap.Washing;
    boardHeading.textContent = meta.title;
    boardSubtitle.textContent = meta.sub;

    btnOpenCreate.classList.toggle("hidden", state.taskFilter !== "Washing");
    const query = state.searchQuery.trim().toLowerCase();
    const filtered = state.tasks.filter((task) => {
      if (task.status !== state.taskFilter) return false;
      if (!query) return true;
      const emp = task.assignedEmployeeId ? getEmployee(task.assignedEmployeeId) : null;
      const m = task.assignedMachineId ? getMachine(task.assignedMachineId) : null;
      return (
        task.title.toLowerCase().includes(query) ||
        task.details.toLowerCase().includes(query) ||
        task.orderNumber.toLowerCase().includes(query) ||
        task.customerName.toLowerCase().includes(query) ||
        String(task.id).includes(query) ||
        (emp && emp.name.toLowerCase().includes(query)) ||
        (m && m.name.toLowerCase().includes(query))
      );
    });

    if (filtered.length === 0) {
      tasksGrid.innerHTML = `<div class="empty-state">No tasks yet. Click <strong>+ New Laundry Task</strong> to create and auto-assign one.</div>`;
      return;
    }
    tasksGrid.innerHTML = filtered.map(renderTaskCard).join("");
  }

  function renderEmployeesView() {
    employeesGrid.innerHTML = state.employees
      .map((emp) => {
        const activeTask = emp.activeTaskId ? getTask(emp.activeTaskId) : null;
        const isSkipped = emp.shiftState !== "On Shift";
        const pillClass = emp.status === "Available" ? "pill-bg-completed" : "pill-bg-priority";

        return `
          <div class="employee-card ${isSkipped ? "is-skipped" : ""}">
            <div class="employee-top">
              <div class="employee-name-wrap">
                <span class="avatar avatar-emp-${emp.id}">E${emp.id}</span>
                <span>${escapeHtml(emp.name)}</span>
              </div>
              <span class="category-pill ${pillClass}">${emp.status}</span>
            </div>
            <div class="employee-meta">
              <span>Daily Tasks: <strong>${emp.dailyTaskCount}</strong></span>
              <span>Last Finished: <strong>${formatTime(emp.lastFinishedAt)}</strong></span>
            </div>
            ${
              activeTask
                ? `
              <div class="active-task-box">
                <div><strong>Folding/Packing:</strong> ${escapeHtml(activeTask.orderNumber)} (#${activeTask.id}) — ${escapeHtml(activeTask.customerName)}</div>
                <div class="card-actions-bar">
                  <button class="btn btn-success btn-small" data-action="complete" data-emp="${emp.id}">Complete Task</button>
                  <button class="btn btn-danger btn-small" data-action="offline" data-emp="${emp.id}">Go Offline Mid-Task</button>
                </div>
              </div>
            `
                : `<div class="empty-state" style="padding:14px;">Available for loading or folding</div>`
            }
            <div class="employee-controls">
              <label for="shift-${emp.id}">Shift / Break State:</label>
              <select id="shift-${emp.id}" data-action="shift" data-emp="${emp.id}">
                <option value="On Shift" ${emp.shiftState === "On Shift" ? "selected" : ""}>On Shift</option>
                <option value="On Break" ${emp.shiftState === "On Break" ? "selected" : ""}>On Break (Skipped)</option>
                <option value="Off Shift" ${emp.shiftState === "Off Shift" ? "selected" : ""}>Off Shift (Skipped)</option>
              </select>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderMachineCard(m) {
    const task = m.currentTaskId ? getTask(m.currentTaskId) : null;
    let tileClass = "tile-available";
    let pillClass = "pill-tile-available";
    let label = "Available";
    let iconColor = "#475569";

    if (m.status === "In Use") {
      if (m.type === "Washer") {
        tileClass = "tile-washing";
        pillClass = "pill-tile-washing";
        label = "Washing";
        iconColor = "#1d4ed8";
      } else {
        tileClass = "tile-drying";
        pillClass = "pill-tile-drying";
        label = "Drying";
        iconColor = "#6d28d9";
      }
    } else if (m.status === "Out of Service") {
      tileClass = "tile-out";
      pillClass = "pill-tile-out";
      label = "Out of Service";
      iconColor = "#be123c";
    }

    return `
      <div class="machine-tile ${tileClass}">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" fill="#ffffff"></rect>
          <line x1="4" y1="7" x2="20" y2="7"></line>
          <circle cx="8" cy="4.5" r="0.7" fill="${iconColor}"></circle>
          <circle cx="11" cy="4.5" r="0.7" fill="${iconColor}"></circle>
          <circle cx="12" cy="14" r="4.5"></circle>
          <path d="M8.5 14.5c1.5-1.2 2.5 1.2 4 0s2.5 1.2 3 0" stroke="${iconColor}" stroke-width="1.5"></path>
        </svg>
        <span class="tile-machine-name">${escapeHtml(m.name)}</span>
        <span class="tile-status-pill ${pillClass}">${label}</span>
        <div class="task-id-label">Uses Today: <strong>${m.dailyUsageCount}</strong></div>
        ${
          m.status === "In Use" && task
            ? `
          <div class="task-id-label"><strong>${escapeHtml(task.orderNumber)}</strong> • ${escapeHtml(task.customerName)} (${task.loadKg} kg)</div>
          <div class="card-actions-bar" style="justify-content:center;">
            <button class="btn btn-success btn-small" data-action="finish-machine" data-machine="${m.id}">Done</button>
            <button class="btn btn-danger btn-small" data-action="breakdown" data-machine="${m.id}">Breakdown</button>
          </div>
        `
            : `
          <div class="card-actions-bar" style="justify-content:center;">
            <button class="btn ${m.status === "Out of Service" ? "btn-success" : "btn-soft"} btn-small" data-action="breakdown" data-machine="${m.id}">
              ${m.status === "Out of Service" ? "Restore" : "Out of Service"}
            </button>
          </div>
        `
        }
      </div>
    `;
  }

  function renderMachinesView() {
    washersGrid.innerHTML = state.machines
      .filter((m) => m.type === "Washer")
      .map(renderMachineCard)
      .join("");
    dryersGrid.innerHTML = state.machines
      .filter((m) => m.type === "Dryer")
      .map(renderMachineCard)
      .join("");
  }

  function renderQueueList(arr, emptyText) {
    if (arr.length === 0) {
      return `<div class="empty-state" style="padding:18px;">${emptyText}</div>`;
    }
    return arr
      .map((entry, idx) => {
        const task = getTask(entry.taskId);
        if (!task) return "";
        const isPriority = entry.priorityPosition === 0;
        return `
          <div class="task-card ${isPriority ? "accent-priority" : "accent-pending"}">
            <div class="card-top-row">
              <span class="category-pill ${isPriority ? "pill-bg-priority" : "pill-bg-pending"}">
                ${isPriority ? "Priority / Rush" : `Queue #${idx + 1}`}
              </span>
              <span class="task-id-label">${escapeHtml(task.orderNumber)}</span>
            </div>
            <div class="card-body">
              <h3>#${task.id} — ${escapeHtml(task.customerName)} (${task.loadKg} kg)</h3>
              <p>${escapeHtml(task.title)}</p>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderQueuesView() {
    const total = state.washerQueue.length + state.dryerQueue.length + state.employeeQueue.length;
    queueCountBadge.textContent = `${total} Waiting`;
    washerQueueCount.textContent = state.washerQueue.length;
    dryerQueueCount.textContent = state.dryerQueue.length;
    employeeQueueCount.textContent = state.employeeQueue.length;

    washerQueueList.innerHTML = renderQueueList(state.washerQueue, "No tasks waiting for a washer.");
    dryerQueueList.innerHTML = renderQueueList(state.dryerQueue, "No tasks waiting for a dryer.");
    employeeQueueList.innerHTML = renderQueueList(state.employeeQueue, "No tasks waiting for an employee.");
  }

  function renderOrdersView() {
    if (!state.orders || state.orders.length === 0) {
      ordersGrid.innerHTML = `<div class="empty-state">No customer orders yet. Create a task to generate an order and receipt.</div>`;
      return;
    }

    ordersGrid.innerHTML = state.orders
      .map((order) => {
        const orderTasks = order.taskIds.map((id) => getTask(id)).filter(Boolean);
        const completedCount = orderTasks.filter((t) => t.status === "Completed").length;
        const isReady = completedCount === orderTasks.length && orderTasks.length > 0;

        return `
          <article class="task-card ${isReady ? "accent-completed" : "accent-washing"}">
            <div>
              <div class="card-top-row">
                <span class="category-pill ${isReady ? "pill-bg-completed" : "pill-bg-washing"}">
                  ${isReady ? "Ready for Pickup" : `${completedCount}/${orderTasks.length} Loads Done`}
                </span>
                <span class="price-badge">${formatPeso(order.totalPrice)}</span>
              </div>
              <div class="card-body" style="margin-top:10px;">
                <div class="task-id-label"><strong>${escapeHtml(order.orderNumber)}</strong> • ${formatTime(order.createdAt)}</div>
                <h3>${escapeHtml(order.customerName)}</h3>
                <p>${escapeHtml(order.title)} — <strong>${order.totalKg} kg</strong> (${order.totalLoads} load${order.totalLoads > 1 ? "s" : ""})</p>
                ${order.addonFee > 0 ? `<div class="task-id-label">Add-on: ${formatPeso(order.addonFee)}</div>` : ""}
              </div>
            </div>
            <div>
              <div class="card-actions-bar" style="margin-bottom:8px;">
                <button class="btn ${order.isPaid ? "btn-success" : "btn-soft"} btn-small" data-action="toggle-paid" data-order="${escapeHtml(order.orderNumber)}">
                  ${order.isPaid ? "Paid ✓" : "Mark Paid"}
                </button>
                <button class="btn btn-soft btn-small" data-action="print-receipt" data-order="${escapeHtml(order.orderNumber)}">
                  Receipt / Print
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderReportsView() {
    const totalOrders = state.orders.length;
    const totalKg = state.orders.reduce((sum, o) => sum + o.totalKg, 0);
    const paidRev = state.orders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.totalPrice, 0);
    const unpaidRev = state.orders.filter((o) => !o.isPaid).reduce((sum, o) => sum + o.totalPrice, 0);

    reportsKpis.innerHTML = `
      <div class="kpi-card">
        <span class="kpi-label">Total Orders</span>
        <span class="kpi-value">${totalOrders}</span>
        <span class="kpi-sub">${state.tasks.length} total laundry loads</span>
      </div>
      <div class="kpi-card" style="border-top-color:var(--cyan);">
        <span class="kpi-label">Total Weight Processed</span>
        <span class="kpi-value">${totalKg} kg</span>
        <span class="kpi-sub">Rate: ${formatPeso(PRICE_PER_KG)} / kg</span>
      </div>
      <div class="kpi-card" style="border-top-color:var(--emerald);">
        <span class="kpi-label">Paid Revenue</span>
        <span class="kpi-value">${formatPeso(paidRev)}</span>
        <span class="kpi-sub">Collected today</span>
      </div>
      <div class="kpi-card" style="border-top-color:var(--amber);">
        <span class="kpi-label">Unpaid Balance</span>
        <span class="kpi-value">${formatPeso(unpaidRev)}</span>
        <span class="kpi-sub">Pending customer pickup</span>
      </div>
    `;

    const empRows = state.employees
      .map((e) => `<div class="side-emp-row"><span>${escapeHtml(e.name)}</span><strong>${e.dailyTaskCount} tasks</strong></div>`)
      .join("");
    const washerRows = state.machines
      .filter((m) => m.type === "Washer")
      .map((m) => `<div class="side-emp-row"><span>${escapeHtml(m.name)}</span><strong>${m.dailyUsageCount} uses</strong></div>`)
      .join("");
    const dryerRows = state.machines
      .filter((m) => m.type === "Dryer")
      .map((m) => `<div class="side-emp-row"><span>${escapeHtml(m.name)}</span><strong>${m.dailyUsageCount} uses</strong></div>`)
      .join("");

    reportsBreakdown.innerHTML = `
      <section class="queue-column">
        <div class="queue-col-header"><h3>Staff Workload</h3></div>
        <div class="queue-list-col">${empRows}</div>
      </section>
      <section class="queue-column">
        <div class="queue-col-header"><h3>Washer Utilization</h3></div>
        <div class="queue-list-col">${washerRows}</div>
      </section>
      <section class="queue-column">
        <div class="queue-col-header"><h3>Dryer Utilization</h3></div>
        <div class="queue-list-col">${dryerRows}</div>
      </section>
    `;
  }

  function renderActivityLog() {
    logCountBadge.textContent = `${state.activityLog.length} Entries`;
    if (state.activityLog.length === 0) {
      activityLogBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">No activity logged yet.</td></tr>`;
      return;
    }

    activityLogBody.innerHTML = state.activityLog
      .map((log) => {
        const emp = log.employeeId ? getEmployee(log.employeeId) : null;
        const machine = log.machineId ? getMachine(log.machineId) : null;
        return `
          <tr>
            <td>#${log.logId}</td>
            <td>#${log.taskId} (${escapeHtml(log.taskTitle)})</td>
            <td><span class="category-pill pill-bg-washing">${log.stage}</span></td>
            <td>${emp ? emp.name : "—"}</td>
            <td>${machine ? machine.name : "—"}</td>
            <td>${formatTime(log.startTime)}</td>
            <td>${formatTime(log.finishTime)}</td>
            <td>${escapeHtml(log.notes)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function render() {
    waitThresholdInput.value = state.waitThresholdSec;
    soundToggleBtn.classList.toggle("is-muted", !state.soundEnabled);
    switchView(state.activeView || "board");
    renderSidebar();
    renderBoard();
    renderEmployeesView();
    renderMachinesView();
    renderQueuesView();
    renderOrdersView();
    renderReportsView();
    renderActivityLog();
  }

  // Event Listeners
  document.querySelectorAll(".rail-btn[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.querySelectorAll("#sidebar-filters .filter-item").forEach((item) => {
    item.addEventListener("click", () => {
      state.taskFilter = item.dataset.filter;
      switchView("board");
      saveState();
      renderSidebar();
      renderBoard();
    });
  });

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    renderBoard();
  });

  waitThresholdInput.addEventListener("change", () => {
    state.waitThresholdSec = Math.max(5, Number(waitThresholdInput.value) || 20);
    saveState();
  });

  soundToggleBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    soundToggleBtn.classList.toggle("is-muted", !state.soundEnabled);
    saveState();
    showToast(`Sound alerts ${state.soundEnabled ? "enabled" : "muted"}.`, "info");
  });

  taskKgInput.addEventListener("input", updateOrderSummary);
  addonFeeInput.addEventListener("input", updateOrderSummary);
  isRushCheckbox.addEventListener("change", () => {
    if (isRushCheckbox.checked) {
      addonFeeInput.value = "150";
      addonFeeInput.readOnly = true;
    } else {
      addonFeeInput.readOnly = false;
      addonFeeInput.value = "0";
    }
    updateOrderSummary();
  });

  function openCreateModal() {
    orderNumberInput.value = `ORD-${state.nextOrderNum}`;
    updateOrderSummary();
    createModal.classList.remove("hidden");
    customerNameInput.focus();
  }
  function closeCreateModal() {
    createModal.classList.add("hidden");
  }

  document.getElementById("btn-rail-add").addEventListener("click", openCreateModal);
  document.getElementById("btn-open-create").addEventListener("click", openCreateModal);
  document.getElementById("btn-close-create").addEventListener("click", closeCreateModal);
  document.getElementById("btn-cancel-create").addEventListener("click", closeCreateModal);

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!customerNameInput.value.trim() || !taskTitleInput.value.trim() || !taskDetailsInput.value.trim()) return;
    createOrderAndScheduleTasks(
      customerNameInput.value,
      taskTitleInput.value,
      taskDetailsInput.value,
      taskKgInput.value,
      addonFeeInput.value,
      isRushCheckbox.checked,
      createdBySelect.value
    );
    customerNameInput.value = "";
    taskTitleInput.value = "";
    taskDetailsInput.value = "";
    taskKgInput.value = "6";
    addonFeeInput.value = "0";
    addonFeeInput.readOnly = false;
    isRushCheckbox.checked = false;
    closeCreateModal();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "complete") completeFoldingTask(Number(btn.dataset.emp));
    else if (action === "offline") handleEmployeeOfflineMidTask(Number(btn.dataset.emp));
    else if (action === "override") openOverrideModal(Number(btn.dataset.task));
    else if (action === "finish-machine") finishMachineStage(Number(btn.dataset.machine));
    else if (action === "breakdown") toggleMachineOutOfService(Number(btn.dataset.machine));
    else if (action === "toggle-paid") toggleOrderPaid(btn.dataset.order);
    else if (action === "print-receipt") openReceiptModal(btn.dataset.order);
  });

  employeesGrid.addEventListener("change", (e) => {
    const select = e.target.closest("select[data-action='shift']");
    if (!select) return;
    handleShiftChange(Number(select.dataset.emp), select.value);
  });

  function closeOverrideModal() {
    overrideModal.classList.add("hidden");
    overrideTargetTaskId = null;
  }
  document.getElementById("btn-close-override").addEventListener("click", closeOverrideModal);
  document.getElementById("btn-cancel-override").addEventListener("click", closeOverrideModal);
  document.getElementById("btn-confirm-override").addEventListener("click", confirmOverride);

  function closeReceiptModal() {
    receiptModal.classList.add("hidden");
  }
  document.getElementById("btn-close-receipt").addEventListener("click", closeReceiptModal);
  document.getElementById("btn-cancel-receipt").addEventListener("click", closeReceiptModal);
  document.getElementById("btn-print-receipt").addEventListener("click", () => window.print());

  document.getElementById("btn-export-orders").addEventListener("click", () => {
    exportCsv(
      "wash_n_dry_orders.csv",
      ["Order No", "Customer", "Service", "Weight (kg)", "Loads", "Add-on (PHP)", "Total (PHP)", "Paid", "Rush", "Created"],
      state.orders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.title,
        o.totalKg,
        o.totalLoads,
        o.addonFee,
        o.totalPrice,
        o.isPaid ? "Paid" : "Unpaid",
        o.isRush ? "Yes" : "No",
        formatDateTime(o.createdAt),
      ])
    );
  });

  document.getElementById("btn-export-log").addEventListener("click", () => {
    exportCsv(
      "wash_n_dry_activity_log.csv",
      ["Log #", "Task", "Stage", "Employee", "Machine", "Start Time", "Finish Time", "Notes"],
      state.activityLog.map((l) => [
        l.logId,
        `#${l.taskId} ${l.taskTitle}`,
        l.stage,
        l.employeeId ? getEmployee(l.employeeId)?.name : "",
        l.machineId ? getMachine(l.machineId)?.name : "",
        formatDateTime(l.startTime),
        formatDateTime(l.finishTime),
        l.notes,
      ])
    );
  });

  document.getElementById("btn-end-of-day").addEventListener("click", endOfDayReset);
  document.getElementById("btn-notif-bell").addEventListener("click", () => switchView("log"));
  document.getElementById("btn-dismiss-alert").addEventListener("click", () => {
    alertBanner.classList.add("hidden");
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    state = defaultState();
    alertBanner.classList.add("hidden");
    bellDot.classList.add("hidden");
    saveState();
    render();
    showToast("System reset to initial state.", "info");
  });

  render();
  setInterval(checkSupervisorAlert, 1000);

  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add("is-done");
    }, 2500);
  }
})();

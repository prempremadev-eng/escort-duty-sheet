// =============================================
// BASE DATE
// =============================================
let savedDate = localStorage.getItem("baseDate");
if (savedDate) {
    savedDate = new Date(savedDate);
    savedDate.setHours(0, 0, 0, 0);
} else {
    savedDate = new Date();
    savedDate.setHours(0, 0, 0, 0);
}
const baseDate = savedDate;

// =============================================
// EMPLOYEES
// =============================================
let employees = [];
try {
    employees = JSON.parse(localStorage.getItem("employees")) || [];
} catch (e) { employees = []; }

// =============================================
// MODE — 'supervisor' or 'input'
// =============================================
let currentMode = localStorage.getItem("appMode") || "supervisor";

function setMode(mode) {
    currentMode = mode;
    localStorage.setItem("appMode", mode);

    // Toggle button styles
    document.getElementById("btnSupervisor").classList.toggle("active", mode === "supervisor");
    document.getElementById("btnInput").classList.toggle("active", mode === "input");
    document.getElementById("btnTest").classList.toggle("active", mode === "test");

    // Mode label
    const label = document.getElementById("modeLabel");
    if (mode === "supervisor") {
        label.textContent = "📋 Daily Print Mode — Name, Agency, Mobile editable";
        label.className   = "mode-label supervisor-label";
    } else if (mode === "test") {
        label.textContent = "🧪 Test Mode — Same as Input, use for testing";
        label.className   = "mode-label test-label";
    } else {
        label.textContent = "✏️ Input Mode — Fill in route, time and remarks";
        label.className   = "mode-label input-label";
    }

    // Body class for CSS targeting
    document.body.className = mode === "supervisor" ? "mode-supervisor"
                            : mode === "test"       ? "mode-test"
                            : "mode-input";

    generateTable();
}

// =============================================
// ROTATE
// =============================================
function rotateGroup(arr, shift) {
    const n = arr.length;
    if (n === 0) return arr;
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        result[((i + shift) % n + n) % n] = arr[i];
    }
    return result;
}

// =============================================
// TODAY STRING
// =============================================
function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// =============================================
// LOAD
// =============================================
window.addEventListener("load", () => {
    document.getElementById("date").value = getTodayString();
    updateCurrentDate();
    setMode(currentMode);  // applies button state + body class
});


// =============================================
// LOCATION AUTOCOMPLETE
// =============================================

const LOCATION_KEY = "savedLocations";

function getSavedLocations() {
    try {
        return JSON.parse(localStorage.getItem(LOCATION_KEY)) || [];
    } catch(e) { return []; }
}

function saveLocation(val) {
    if (!val || val.trim().length < 2) return;
    val = val.trim();
    let list = getSavedLocations();
    // Remove duplicate, add to front
    list = [val, ...list.filter(l => l.toLowerCase() !== val.toLowerCase())];
    // Keep max 50
    list = list.slice(0, 50);
    localStorage.setItem(LOCATION_KEY, JSON.stringify(list));
}

function showLocationSuggestions(input) {
    const val  = input.value.trim().toLowerCase();
    const list = getSavedLocations().filter(l =>
        val.length === 0 || l.toLowerCase().includes(val)
    );

    removeLocationDropdown();
    if (list.length === 0) return;

    _locTarget = input;

    const rect = input.getBoundingClientRect();

    const drop = document.createElement("div");
    drop.id = "locDrop";
    drop.style.cssText = `
        position: fixed;
        top:  ${rect.bottom + 2}px;
        left: ${rect.left}px;
        width: ${Math.max(rect.width, 180)}px;
        background: #fff;
        border: 2px solid #2563eb;
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        z-index: 9999;
        max-height: 200px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        font-family: inherit;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
    `;

    list.forEach(loc => {
        const item = document.createElement("div");
        item.style.cssText = `
            padding: 10px 14px;
            font-size: 14px;
            font-weight: 500;
            color: #1e293b;
            cursor: pointer;
            border-bottom: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        `;
        item.innerHTML = `<span style="color:#2563eb;font-size:12px;">📍</span>
                          <span style="overflow:hidden;text-overflow:ellipsis;">${loc}</span>`;

        item.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            selectLocation(loc);
        });
        item.addEventListener("mouseover",  () => item.style.background = "#eff6ff");
        item.addEventListener("mouseout",   () => item.style.background = "");
        drop.appendChild(item);
    });

    document.body.appendChild(drop);
}

let _locTarget = null;

function selectLocation(loc) {
    if (_locTarget) {
        _locTarget.value = loc;
        saveLocation(loc);
        highlightOutIfEmpty(_locTarget);
        activateRow(_locTarget);
        _locTarget.focus();
    }
    removeLocationDropdown();
}

function removeLocationDropdown() {
    const old = document.getElementById("locDrop");
    if (old) old.remove();
    _locTarget = null;
}

function onLocationBlur(input) {
    setTimeout(() => removeLocationDropdown(), 200);
    saveLocation(input.value);
}


// =============================================
// SAVE & RESTORE INPUT DATA (survives re-render)
// =============================================

function saveTableData() {
    const data = {};

    // Save by data-key (reliable across re-renders)
    document.querySelectorAll("[data-key]").forEach(el => {
        const k = el.dataset.key;
        if (!k) return;
        if (el.value)               data[k]          = el.value;
        if (el.dataset.raw)         data[k + "_raw"] = el.dataset.raw;
        if (el.classList.contains("locked-time"))  data[k + "_lock"]  = "1";
        if (el.classList.contains("disabled-time") && el.classList.contains("in-time"))
                                    data[k + "_dis"]  = "1";
    });

    return data;
}

function restoreTableData(data) {
    if (!data || Object.keys(data).length === 0) return;

    document.querySelectorAll("[data-key]").forEach(el => {
        const k = el.dataset.key;
        if (!k) return;

        if (data[k]) {
            el.value = data[k];
            if (data[k + "_raw"]) el.dataset.raw = data[k + "_raw"];
        }

        if (data[k + "_lock"]) {
            el.classList.add("locked-time");
            el.classList.remove("disabled-time");
            el.onclick = () => showTimeError("Time already set — cannot be changed");
        }

        // Keep in-time disabled if no out value
        if (el.classList.contains("in-time") && !data[k]) {
            el.classList.add("disabled-time");
        }
    });

    // Re-enable in-times where out is set but both not locked
    document.querySelectorAll(".out-time").forEach(outEl => {
        if (outEl.value && !outEl.classList.contains("locked-time")) {
            enableInTime(outEl);
        }
    });

    // Re-unlock routes that were previously unlocked (data restored)
    document.querySelectorAll("td.route-cell[data-route-idx]").forEach(cell => {
        const idx = parseInt(cell.dataset.routeIdx);
        if (idx === 0) return; // Route 1 always active
        if (cell.classList.contains("route-seq-locked")) {
            // Check if previous route has both out + in values
            const tr       = cell.closest("tr");
            const prevCell = tr && tr.querySelector(`td[data-route-idx="${idx - 1}"]`);
            const prevOut  = prevCell && prevCell.querySelector(".out-time");
            const prevIn   = prevCell && prevCell.querySelector(".in-time");
            if (prevOut && prevOut.value && prevIn && prevIn.value) {
                unlockRoute(cell, idx);
            }
        }
    });
}

// =============================================
// GENERATE TABLE
// =============================================
function generateTable() {

    // ✅ Save entered data before re-render
    _savedTableData = saveTableData();

    if (employees.length === 0) {
        document.getElementById("tableContainer").innerHTML = `
            <div style="padding:60px 20px;text-align:center;
                        font-size:clamp(18px,5vw,26px);color:#666;font-weight:bold;">
                📂 Please Upload Excel File
            </div>`;
        return;
    }

    const inputDate = document.getElementById("date").value;
    updateCurrentDate();
    if (!inputDate) return;

    const [yyyy, mm, dd] = inputDate.split("-").map(Number);
    const selectedDate   = new Date(yyyy, mm - 1, dd);
    selectedDate.setHours(0, 0, 0, 0);

    const diffDays   = Math.floor((selectedDate - baseDate) / (1000 * 60 * 60 * 24));
    const shiftInput = parseInt(document.getElementById("shiftValue").value) || 4;
    const shift      = diffDays * shiftInput;

    const groupA    = employees.slice(0, 10);
    const groupB    = employees.slice(10);
    const finalList = [...rotateGroup(groupA, shift), ...rotateGroup(groupB, shift)];

    const searchText = (document.getElementById("searchInput").value || "").toLowerCase().trim();
    const isSuper    = currentMode === "supervisor";

    let html = "";
    const rowsPerPage = 15;
    const totalPages  = 5;

    for (let page = 0; page < totalPages; page++) {
        const start    = page * rowsPerPage;
        const pageData = finalList.slice(start, start + rowsPerPage);

        html += `<div class="page-group">`;
        html += `<div class="print-page-header">
                    <div class="page-date">${window.formattedDate || ""}</div>
                 </div>`;
        html += createTableStart();

        for (let row = 0; row < rowsPerPage; row++) {
            const emp = pageData[row];

            if (emp) {
                let hlClass = "";
                if (searchText && (
                    (emp.name   || "").toLowerCase().includes(searchText) ||
                    (emp.mobile || "").includes(searchText) ||
                    (emp.id     || "").includes(searchText)
                )) { hlClass = "highlight-row"; }

                if (isSuper) {
                    // ── DAILY PRINT MODE: Name/Agency/Mobile editable, rest plain ──
                    const rk = `r${start + row}`;
                    html += `
                    <tr class="${hlClass}">
                        <td>${start + row + 1}</td>
                        <td><input class="cell-input" data-key="${rk}_name"   value="${escHtml(emp.name)}"   inputmode="text"  onfocus="activateRow(this)"></td>
                        <td><input class="cell-input" data-key="${rk}_agency" value="${escHtml(emp.agency)}" inputmode="text"  onfocus="activateRow(this)"></td>
                        <td><input class="cell-input" data-key="${rk}_mobile" value="${escHtml(emp.mobile)}" inputmode="tel"   onfocus="activateRow(this)"></td>
                        <td><input class="cell-input" data-key="${rk}_id"     value="${escHtml(emp.id)}"     inputmode="text"  onfocus="activateRow(this)"></td>
                        ${routeBoxSuper()}${routeBoxSuper()}${routeBoxSuper()}${routeBoxSuper()}
                        <td></td>
                    </tr>`;
                } else {
                    // ── INPUT MODE: plain data; only route+remarks editable ──
                    const rki = `r${start + row}`;
                    html += `
                    <tr class="${hlClass}">
                        <td>${start + row + 1}</td>
                        <td class="data-cell">${escHtml(emp.name)}</td>
                        <td class="data-cell">${escHtml(emp.agency)}</td>
                        <td class="data-cell">${escHtml(emp.mobile)}</td>
                        <td class="data-cell">${escHtml(emp.id)}</td>
                        ${routeBoxInput(rki)}${routeBoxInput(rki, 1)}${routeBoxInput(rki, 2)}${routeBoxInput(rki, 3)}
                        <td><input class="cell-input" data-key="${rki}_remarks" value="" inputmode="text"></td>
                    </tr>`;
                }

            } else {
                if (isSuper) {
                    html += `
                    <tr>
                        <td>${start + row + 1}</td>
                        <td></td><td></td><td></td><td></td>
                        ${routeBoxSuper()}${routeBoxSuper()}${routeBoxSuper()}${routeBoxSuper()}
                        <td></td>
                    </tr>`;
                } else {
                    const rke = `r${start + row}`;
                    html += `
                    <tr>
                        <td>${start + row + 1}</td>
                        <td></td><td></td><td></td><td></td>
                        ${routeBoxInput(rke)}${routeBoxInput(rke,1)}${routeBoxInput(rke,2)}${routeBoxInput(rke,3)}
                        <td><input class="cell-input" data-key="${rke}_remarks" value="" inputmode="text" onfocus="activateRow(this)"></td>
                    </tr>`;
                }
            }
        }

        // Input mode: footer only on last page
        if (currentMode === 'input' || currentMode === 'test') {
            if (page === totalPages - 1) {
                html += footerRows();
            }
        } else {
            html += footerRows();
        }
        html += `</tbody></table></div>`;

        if (page < totalPages - 1) {
            html += `<div class="page-break"></div>`;
        }
    }

    document.getElementById("tableContainer").innerHTML = html;

    // ✅ Restore previously entered data after re-render
    restoreTableData(_savedTableData);
    _savedTableData = null;

    const hlRow = document.querySelector(".highlight-row");
    if (hlRow) hlRow.scrollIntoView({ behavior: "smooth", block: "center" });
}

// =============================================
// SUPERVISOR ROUTE BOX — empty boxes, no inputs
// =============================================
function routeBoxSuper() {
    return `
    <td class="route-cell">
        <div class="route-box">
            <div class="route-top"></div>
            <div class="route-bottom">
                <div class="route-half"></div>
                <div class="route-half"></div>
            </div>
        </div>
    </td>`;
}

// =============================================
// INPUT ROUTE BOX — location + time pickers
// =============================================
function routeBoxInput(rowKey, routeIdx) {
    rowKey   = rowKey   || "r0";
    routeIdx = routeIdx || 0;
    const rk      = `${rowKey}_rt${routeIdx}`;
    const locked  = routeIdx > 0; // Routes 2,3,4 locked initially
    const lockCls = locked ? " route-seq-locked" : "";
    const lockedClick = locked
        ? `checkRouteSequence(this, ${routeIdx})`
        : `activateRow(this); showLocationSuggestions(this)`;
    const outClick = locked
        ? `checkRouteSequence(this, ${routeIdx})`
        : `activateRow(this); this.value ? reopenOutTime(this) : openDesktopTimePicker(this, 'Out Time')`;

    return `
    <td class="route-cell${lockCls}" data-route-idx="${routeIdx}" data-row-key="${rowKey}">
        <div class="route-box">
            <div class="route-top">
                <input type="text" class="route-location${locked ? " seq-disabled" : ""}"
                       data-key="${rk}_loc"
                       placeholder="${locked ? "" : "Location"}"
                       autocomplete="off" autocorrect="off"
                       autocapitalize="words" spellcheck="false"
                       ${locked ? 'readonly' : ''}
                       oninput="${locked ? '' : 'showLocationSuggestions(this); highlightOutIfEmpty(this);'}"
                       onblur="${locked ? '' : 'onLocationBlur(this)'}"
                       onfocus="${locked ? '' : 'activateRow(this); showLocationSuggestions(this);'}"
                       onclick="${locked ? `checkRouteSequence(this, ${routeIdx})` : ''}">
            </div>
            <div class="route-bottom">
                <div class="route-half">
                    <input type="text" class="route-time out-time${locked ? " seq-disabled" : ""}"
                           data-key="${rk}_out"
                           placeholder="Out" readonly
                           onclick="${outClick}">
                </div>
                <div class="route-half">
                    <input type="text" class="route-time in-time disabled-time${locked ? " seq-disabled" : ""}"
                           data-key="${rk}_in"
                           placeholder="In" readonly
                           title="${locked ? "Complete Route " + routeIdx + " first" : "Enter Out time first"}"
                           onclick="${locked ? `checkRouteSequence(this, ${routeIdx})` : 'activateRow(this); checkOutFirst(this)'}">
                </div>
            </div>
        </div>
    </td>`;
}

// ── Check if previous route has Out time before allowing this route ──
function checkRouteSequence(el, routeIdx) {
    activateRow(el);
    const tr = el.closest("tr");
    if (!tr) return;

    // Find previous route cell
    const prevCell = tr.querySelector(`td[data-route-idx="${routeIdx - 1}"]`);
    if (!prevCell) return;

    const prevOut = prevCell.querySelector(".out-time");
    const prevIn  = prevCell.querySelector(".in-time");

    // Need IN time to be set (trip complete) to unlock next route
    if (!prevOut || !prevOut.value || !prevIn || !prevIn.value) {
        prevCell.classList.add("route-flash");
        setTimeout(() => prevCell.classList.remove("route-flash"), 800);
        const msg = (!prevOut || !prevOut.value)
            ? `Enter Out time in Route ${routeIdx} first`
            : `Complete Route ${routeIdx} — enter In time first`;
        showTimeError(msg);
        return;
    }

    // Previous route complete — unlock this route
    unlockRoute(el.closest("td.route-cell"), routeIdx);
}

// ── Unlock a route cell ──
function unlockRoute(cell, routeIdx) {
    if (!cell) return;
    cell.classList.remove("route-seq-locked");

    const locInput = cell.querySelector(".route-location");
    const outInput = cell.querySelector(".out-time");
    const inInput  = cell.querySelector(".in-time");

    if (locInput) {
        locInput.classList.remove("seq-disabled");
        locInput.removeAttribute("readonly");
        locInput.removeAttribute("onclick");
        locInput.placeholder = "Location";

        // Remove old listeners by cloning
        const newLoc = locInput.cloneNode(true);
        locInput.parentNode.replaceChild(newLoc, locInput);

        newLoc.addEventListener("input",  () => { showLocationSuggestions(newLoc); highlightOutIfEmpty(newLoc); });
        newLoc.addEventListener("blur",   () => { onLocationBlur(newLoc); });
        newLoc.addEventListener("focus",  () => { activateRow(newLoc); showLocationSuggestions(newLoc); });
        newLoc.addEventListener("click",  () => { activateRow(newLoc); });

        // Focus + scroll into view (mobile)
        setTimeout(() => {
            newLoc.focus();
            newLoc.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 200);
    }

    if (outInput) {
        outInput.classList.remove("seq-disabled");
        outInput.title = "";
        outInput.removeAttribute("onclick");

        const newOut = outInput.cloneNode(true);
        outInput.parentNode.replaceChild(newOut, outInput);

        newOut.addEventListener("click",        () => { activateRow(newOut); });
        newOut.addEventListener("pointerdown",  () => { activateRow(newOut); });
        newOut.addEventListener("click", (e) => {
            e.stopPropagation();
            if (newOut.value) {
                reopenOutTime(newOut);
            } else {
                openDesktopTimePicker(newOut, "Out Time");
            }
        });
    }

    if (inInput) {
        inInput.classList.remove("seq-disabled");
        inInput.title = "Enter Out time first";
        inInput.removeAttribute("onclick");

        const newIn = inInput.cloneNode(true);
        inInput.parentNode.replaceChild(newIn, inInput);

        newIn.addEventListener("click", (e) => {
            e.stopPropagation();
            activateRow(newIn);
            checkOutFirst(newIn);
        });
        newIn.addEventListener("pointerdown", () => { activateRow(newIn); });
    }
}

// ── After In time confirmed (trip complete) — unlock next route ──
function unlockNextRoute(inEl) {
    const cell     = inEl.closest("td.route-cell");
    if (!cell) return;
    const routeIdx = parseInt(cell.dataset.routeIdx);
    if (isNaN(routeIdx)) return;
    const tr       = inEl.closest("tr");
    if (!tr) return;
    const nextCell = tr.querySelector(`td[data-route-idx="${routeIdx + 1}"]`);
    if (nextCell && nextCell.classList.contains("route-seq-locked")) {
        unlockRoute(nextCell, routeIdx + 1);
    }
}




// =============================================
// GRACE PERIOD — 2 minutes to change Out Time
// =============================================
const GRACE_MS = 2 * 60 * 1000;
let _savedTableData = null; // 2 minutes in ms

function startGracePeriod(outEl) {
    // Clear any existing timer
    if (outEl._graceTimer) clearTimeout(outEl._graceTimer);
    // Silently lock after 2 minutes — no badge, no countdown
    outEl._graceTimer = setTimeout(() => {
        lockOutTime(outEl);
    }, GRACE_MS);
}

function lockOutTime(outEl) {
    if (outEl._graceTimer) clearTimeout(outEl._graceTimer);
    outEl.classList.add("locked-time");
    outEl.onclick = () => showTimeError("Out time locked — 2 min grace period over");
}

// =============================================
// SHIFT WINDOW: 21:00 to 08:30 only
// Night shift — spans midnight
// =============================================
function isWithinShift(timeStr) {
    const mins = toMins(timeStr);
    const start = toMins("21:00"); // 1260
    const end   = toMins("08:30"); // 510
    // Shift spans midnight: valid = >= 21:00 OR <= 08:30
    return mins >= start || mins <= end;
}

function getShiftError(timeStr) {
    if (!isWithinShift(timeStr)) {
        return "Time must be within shift hours (21:00 to 08:30)";
    }
    return null;
}

// ── Time validation helpers ──
function getNow() {
    const n = new Date();
    return String(n.getHours()).padStart(2,"0") + ":" + String(n.getMinutes()).padStart(2,"0");
}
function toMins(t) {
    const [h,m] = t.split(":").map(Number);
    return h * 60 + m;
}
function showTimeError(msg) {
    let toast = document.getElementById("timeToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "timeToast";
        toast.style.cssText = `
            position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
            background:#dc2626; color:#fff; padding:10px 20px;
            border-radius:10px; font-size:14px; font-weight:600;
            z-index:99999; box-shadow:0 4px 16px rgba(220,38,38,0.4);
            white-space:nowrap; pointer-events:none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = "⚠ " + msg;
    toast.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.display = "none"; }, 2500);
}

// ── Lock both out and in after in-time is confirmed ──
function lockRouteTimes(inEl) {
    const bottom = inEl.closest(".route-bottom");
    if (!bottom) return;
    const outEl = bottom.querySelector(".out-time");
    const lockedInEl = bottom.querySelector(".in-time");
    [outEl, lockedInEl].forEach(el => {
        if (!el) return;
        el.classList.add("locked-time");
        el.onclick = () => showTimeError("Time already set — cannot be changed");
    });
}


// ── Highlight location input if empty when out-time is set ──
function highlightLocationIfEmpty(outEl) {
    const routeTop = outEl.closest(".route-cell")
                          .querySelector(".route-top");
    if (!routeTop) return;
    const locInput = routeTop.querySelector(".route-location");
    if (!locInput || locInput.value.trim()) return; // already has value

    // Highlight + focus
    locInput.classList.add("location-highlight");
    locInput.focus();

    // Remove highlight when user starts typing
    locInput.addEventListener("input", function onInput() {
        locInput.classList.remove("location-highlight");
        locInput.removeEventListener("input", onInput);
    }, { once: true });

    // Also remove highlight on blur if still empty
    locInput.addEventListener("blur", function onBlur() {
        locInput.classList.remove("location-highlight");
        locInput.removeEventListener("blur", onBlur);
    }, { once: true });
}


// ── Location entered → highlight Out time ──
function highlightOutIfEmpty(locInput) {
    const routeBottom = locInput.closest(".route-cell")
                                .querySelector(".route-bottom");
    if (!routeBottom) return;
    const outEl = routeBottom.querySelector(".out-time");
    if (!outEl || outEl.value) return; // already has value

    outEl.classList.add("out-highlight");

    outEl.addEventListener("click", function onOut() {
        outEl.classList.remove("out-highlight");
        outEl.removeEventListener("click", onOut);
    }, { once: true });
}

// ── Row focus — highlight active row, dim others ──
function activateRow(el) {
    const allRows = document.querySelectorAll("tbody tr");
    const activeRow = el.closest("tr");
    if (!activeRow) return;

    allRows.forEach(tr => {
        if (tr === activeRow) {
            tr.classList.add("active-row");
            tr.classList.remove("dim-row");
        } else {
            tr.classList.remove("active-row");
            tr.classList.add("dim-row");
        }
    });
}

function deactivateRows() {
    document.querySelectorAll("tbody tr").forEach(tr => {
        tr.classList.remove("active-row", "dim-row");
    });
}

// Global click — deactivate rows only if click is outside table AND no modal open
document.addEventListener("click", (e) => {
    // Don't deactivate if any picker modal is visible
    const mobileModal  = document.getElementById("timePicker");
    const desktopModal = document.getElementById("modernTimePicker");
    const locDrop      = document.getElementById("locDrop");

    if (mobileModal  && mobileModal.style.display  === "flex") return;
    if (desktopModal && desktopModal.style.display  === "flex") return;
    if (locDrop      && locDrop.contains(e.target))             return;

    if (!e.target.closest("table")) {
        deactivateRows();
    }
});

// ── Check out-time before allowing in-time ──
function checkOutFirst(inEl) {
    const outEl = inEl.closest(".route-bottom").querySelector(".out-time");
    if (!outEl || !outEl.value) {
        // Flash out-time to hint user
        outEl.style.background = "#fef08a";
        setTimeout(() => { outEl.style.background = ""; }, 800);
        return;
    }
    // Out is set — open desktop grid picker (all devices)
    inEl.classList.remove("disabled-time");
    openDesktopTimePicker(inEl, "In Time");
}

// ── Re-open out-time picker if still in grace period ──
function reopenOutTime(outEl) {
    if (outEl.classList.contains("locked-time")) {
        showTimeError("Out time locked — 2 min grace period over");
        return;
    }
    // Still in grace — re-edit with desktop grid picker
    openDesktopTimePicker(outEl, "Out Time");
}

// ── After out-time confirmed, enable the in-time in same route-half ──
function enableInTime(outEl) {
    const inEl = outEl.closest(".route-bottom").querySelector(".in-time");
    if (inEl) {
        inEl.classList.remove("disabled-time");
        inEl.title = "In Time";
    }
}

// =============================================
// MOBILE TIME PICKER — simple native modal
// =============================================
let _mobileTimeTarget = null;

function openMobileTimePicker(el) {
    _mobileTimeTarget = el;
    const inp = document.getElementById("timePickerInput");
    inp.value = el.dataset.raw || "";
    document.getElementById("timePicker").style.display = "flex";
    setTimeout(() => inp.focus(), 100);
}

// =============================================
// ⚡ NOW BUTTON — set current time instantly
// =============================================

// Mobile: set current time into picker input then confirm
function setNowTimeMobile() {
    const now = getNow();
    const inp = document.getElementById("timePickerInput");
    inp.value = now;
    // Trigger confirm directly — validation runs inside confirmTime()
    confirmTime();
}

// Desktop: select current hour+minute in grids then confirm
function setNowTimeDesktop() {
    const now  = getNow();
    const [h, m] = now.split(":").map(Number);

    // Select hour button
    const hGrid = document.getElementById("hourGrid");
    hGrid.querySelectorAll(".tg-btn").forEach(b => {
        b.classList.toggle("tg-selected", parseInt(b.dataset.val) === h);
    });

    // Select nearest minute in scroll list
    const mList  = document.getElementById("minScrollList");
    const mItems = mList.querySelectorAll(".min-item");
    let closest  = null;
    let minDiff  = 999;
    mItems.forEach(item => {
        const diff = Math.abs(parseInt(item.dataset.val) - m);
        if (diff < minDiff) { minDiff = diff; closest = item; }
    });
    mList.querySelectorAll(".min-item").forEach(i => i.classList.remove("min-selected"));
    if (closest) {
        closest.classList.add("min-selected");
        closest.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    updateDesktopPreview();

    // Confirm immediately
    confirmModernTime();
}

function confirmTime() {
    const inp = document.getElementById("timePickerInput");
    if (_mobileTimeTarget && inp.value) {
        const selected  = inp.value;
        const isTest    = currentMode === 'test';

        if (_mobileTimeTarget.classList.contains("out-time")) {
            // TEST MODE — no restrictions
            if (!isTest) {
                if (!isWithinShift(selected)) {
                    showTimeError("Shift hours only: 21:00 to 08:30");
                    return;
                }
                if (toMins(selected) > toMins(getNow())) {
                    showTimeError("Out time cannot be after current time (" + getNow() + ")");
                    return;
                }
            }
            _mobileTimeTarget.value       = selected;
            _mobileTimeTarget.dataset.raw = selected;
            enableInTime(_mobileTimeTarget);
            startGracePeriod(_mobileTimeTarget);
            highlightLocationIfEmpty(_mobileTimeTarget);

        } else if (_mobileTimeTarget.classList.contains("in-time")) {
            const outEl  = _mobileTimeTarget.closest(".route-bottom").querySelector(".out-time");
            const outVal = outEl ? outEl.dataset.raw : "";
            // TEST MODE — no restrictions
            if (!isTest) {
                if (!isWithinShift(selected)) {
                    showTimeError("Shift hours only: 21:00 to 08:30");
                    return;
                }
                if (outVal && toMins(selected) <= toMins(outVal)) {
                    showTimeError("In time must be after Out time (" + outVal + ")");
                    return;
                }
                if (toMins(selected) > toMins(getNow())) {
                    showTimeError("In time cannot be after current time (" + getNow() + ")");
                    return;
                }
            } else {
                // Test mode: only check in > out
                if (outVal && toMins(selected) <= toMins(outVal)) {
                    showTimeError("In time must be after Out time (" + outVal + ")");
                    return;
                }
            }
            _mobileTimeTarget.value       = selected;
            _mobileTimeTarget.dataset.raw = selected;
            lockRouteTimes(_mobileTimeTarget);
            unlockNextRoute(_mobileTimeTarget);
        }
    }
    document.getElementById("timePicker").style.display = "none";
    if (_mobileTimeTarget) activateRow(_mobileTimeTarget);
    _mobileTimeTarget = null;
}
function cancelTime() {
    document.getElementById("timePicker").style.display = "none";
    if (_mobileTimeTarget) activateRow(_mobileTimeTarget);
    _mobileTimeTarget = null;
}

// Daily Print mode also uses mobile simple picker
let _timeTarget = null;
function pickTime(el) {
    _timeTarget = el;
    const inp = document.getElementById("timePickerInput");
    inp.value = el.dataset.raw || "";
    document.getElementById("timePicker").style.display = "flex";
    setTimeout(() => inp.focus(), 100);
}

// =============================================
// DESKTOP TIME PICKER — Hour grid + Minute scroll list
// =============================================
let _desktopTimeTarget = null;

function openDesktopTimePicker(el, label) {
    _desktopTimeTarget = el;
    document.getElementById("modernTimeLabel").textContent = label || "Select Time";

    const raw  = el.dataset.raw || "";
    const selH = raw ? parseInt(raw.split(":")[0]) : -1;
    const selM = raw ? parseInt(raw.split(":")[1]) : -1;

    // ── Hour grid 00–23 (4 columns) — grey out non-shift hours ──
    const hGrid = document.getElementById("hourGrid");
    hGrid.innerHTML = "";
    for (let i = 0; i < 24; i++) {
        const btn = document.createElement("button");
        // Invalid hours: 09 to 20 (outside 21:00-08:30 shift)
        const invalid = currentMode !== 'test' && (i >= 9 && i <= 20);
        btn.className   = "tg-btn" + (i === selH ? " tg-selected" : "") + (invalid ? " tg-invalid" : "");
        btn.textContent = String(i).padStart(2, "0");
        btn.dataset.val = i;
        btn.type        = "button";
        btn.title       = invalid ? "Outside shift hours (21:00-08:30)" : "";
        btn.onclick     = () => {
            if (invalid) {
                showTimeError("Shift hours only: 21:00 to 08:30");
                return;
            }
            hGrid.querySelectorAll(".tg-btn").forEach(b => b.classList.remove("tg-selected"));
            btn.classList.add("tg-selected");
            updateDesktopPreview();
        };
        hGrid.appendChild(btn);
    }

    // ── Minute scroll list 00–59 ──
    const mList = document.getElementById("minScrollList");
    mList.innerHTML = "";
    for (let i = 0; i < 60; i++) {
        const div = document.createElement("div");
        div.className   = "min-item" + (i === selM ? " min-selected" : "");
        div.textContent = String(i).padStart(2, "0");
        div.dataset.val = i;
        div.onclick     = () => {
            mList.querySelectorAll(".min-item").forEach(d => d.classList.remove("min-selected"));
            div.classList.add("min-selected");
            updateDesktopPreview();
        };
        mList.appendChild(div);
    }

    // Scroll selected minute into center
    setTimeout(() => {
        const sel = mList.querySelector(".min-selected");
        if (sel) sel.scrollIntoView({ block: "center", behavior: "instant" });
    }, 30);

    updateDesktopPreview();
    document.getElementById("modernTimePicker").style.display = "flex";
}

function updateDesktopPreview() {
    const hBtn = document.querySelector("#hourGrid .tg-selected");
    const mDiv = document.querySelector("#minScrollList .min-selected");
    const h = hBtn ? String(hBtn.dataset.val).padStart(2, "0") : "--";
    const m = mDiv ? String(mDiv.dataset.val).padStart(2, "0") : "--";
    document.getElementById("timePreview").textContent = `${h}:${m}`;
}

function confirmModernTime() {
    const hBtn = document.querySelector("#hourGrid .tg-selected");
    const mDiv = document.querySelector("#minScrollList .min-selected");
    if (!hBtn || !mDiv) { alert("Please select hour and minute."); return; }

    const val    = `${String(hBtn.dataset.val).padStart(2,"0")}:${String(mDiv.dataset.val).padStart(2,"0")}`;
    const isTest = currentMode === 'test';

    if (_desktopTimeTarget.classList.contains("out-time")) {
        if (!isTest) {
            if (!isWithinShift(val)) {
                showTimeError("Shift hours only: 21:00 to 08:30");
                return;
            }
            if (toMins(val) > toMins(getNow())) {
                showTimeError("Out time cannot be after current time (" + getNow() + ")");
                return;
            }
        }
        _desktopTimeTarget.value       = val;
        _desktopTimeTarget.dataset.raw = val;
        enableInTime(_desktopTimeTarget);
        startGracePeriod(_desktopTimeTarget);
        highlightLocationIfEmpty(_desktopTimeTarget);

    } else if (_desktopTimeTarget.classList.contains("in-time")) {
        const outEl  = _desktopTimeTarget.closest(".route-bottom").querySelector(".out-time");
        const outVal = outEl ? outEl.dataset.raw : "";
        if (!isTest) {
            if (!isWithinShift(val)) {
                showTimeError("Shift hours only: 21:00 to 08:30");
                return;
            }
            if (outVal && toMins(val) <= toMins(outVal)) {
                showTimeError("In time must be after Out time (" + outVal + ")");
                return;
            }
            if (toMins(val) > toMins(getNow())) {
                showTimeError("In time cannot be after current time (" + getNow() + ")");
                return;
            }
        } else {
            // Test mode: only check in > out
            if (outVal && toMins(val) <= toMins(outVal)) {
                showTimeError("In time must be after Out time (" + outVal + ")");
                return;
            }
        }
        _desktopTimeTarget.value       = val;
        _desktopTimeTarget.dataset.raw = val;
        lockRouteTimes(_desktopTimeTarget);
        unlockNextRoute(_desktopTimeTarget);
    }

    document.getElementById("modernTimePicker").style.display = "none";
    if (_desktopTimeTarget) activateRow(_desktopTimeTarget);
    _desktopTimeTarget = null;
}

function cancelModernTime() {
    document.getElementById("modernTimePicker").style.display = "none";
    if (_desktopTimeTarget) activateRow(_desktopTimeTarget);
    _desktopTimeTarget = null;
}

// =============================================
// HTML ESCAPE
// =============================================
function escHtml(str) {
    return String(str || "")
        .replace(/&/g,"&amp;").replace(/"/g,"&quot;")
        .replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// =============================================
// TABLE START
// =============================================
function createTableStart() {
    return `
    <table>
        <thead>
            <tr>
                <th rowspan="2">S.No</th>
                <th rowspan="2">Name of Escort</th>
                <th rowspan="2">Agency</th>
                <th rowspan="2">Mobile No</th>
                <th rowspan="2">ID No</th>
                <th>Route 1</th>
                <th>Route 2</th>
                <th>Route 3</th>
                <th>Route 4</th>
                <th rowspan="2">Remarks</th>
            </tr>
            <tr>
                <th>Out | In</th>
                <th>Out | In</th>
                <th>Out | In</th>
                <th>Out | In</th>
            </tr>
        </thead>
        <tbody>`;
}

// =============================================
// FOOTER
// =============================================
function footerRows() {
    return `
    <tr class="footer-row">
        <td colspan="2">Total Trip</td>
        <td></td><td></td><td></td>
        <td colspan="3" rowspan="4">Grand Total</td>
        <td rowspan="4"></td><td rowspan="4"></td>
    </tr>
    <tr class="footer-row">
        <td colspan="2">IPF Security</td>
        <td></td><td></td><td></td>
    </tr>
    <tr class="footer-row">
        <td colspan="2">ISI Security</td>
        <td></td><td></td><td></td>
    </tr>
    <tr class="footer-row">
        <td colspan="2">BSS Security</td>
        <td></td><td></td><td></td>
    </tr>`;
}

// =============================================
// PRINT
// =============================================
function printPage() {
    setTimeout(() => window.print(), 150);
}

// =============================================
// UPLOAD EXCEL
// =============================================
function uploadExcel() {
    const fileInput = document.getElementById("excelFile");
    const file      = fileInput.files[0];
    if (!file) { alert("Please select an Excel file (.xlsx or .xls)"); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data      = new Uint8Array(e.target.result);
            const workbook  = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData  = XLSX.utils.sheet_to_json(worksheet);
            if (jsonData.length === 0) { alert("Excel file is empty."); return; }

            employees = [];
            jsonData.forEach(row => {
                employees.push({
                    name:   String(row.Name   || row["Name of Escort"] || "").trim(),
                    agency: String(row.Agency || "").trim(),
                    mobile: String(row.Mobile || row["Mobile No"]      || "").trim(),
                    id:     String(row.ID     || row["ID No"]          || "").trim()
                });
            });

            localStorage.setItem("employees", JSON.stringify(employees));
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            localStorage.setItem("baseDate", now.toISOString());
            fileInput.value = "";
            alert(`✅ Uploaded ${employees.length} employees successfully!`);
            generateTable();
        } catch (err) {
            alert("Error reading file. Please check the format.");
            console.error(err);
        }
    };
    reader.onerror = () => alert("Failed to read file. Please try again.");
    reader.readAsArrayBuffer(file);
}

// =============================================
// DATE DISPLAY
// =============================================
function updateCurrentDate() {
    const val = document.getElementById("date").value;
    if (!val) return;
    const [y, m, d] = val.split("-").map(Number);
    const sel = new Date(y, m - 1, d);
    let fmt;
    try {
        fmt = sel.toLocaleDateString("en-GB", {
            weekday:"long", year:"numeric", month:"2-digit", day:"2-digit"
        });
    } catch(e) {
        const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        fmt = `${days[sel.getDay()]}, ${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
    }
    document.getElementById("currentDay").innerText = fmt;
    window.formattedDate = fmt;
}

document.getElementById("date").value = getTodayString();
updateCurrentDate();
document.getElementById("date").addEventListener("change", () => {
    updateCurrentDate();
    generateTable();
});

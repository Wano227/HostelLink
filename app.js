/* HostelLink – Student interface. Data lives in localStorage until a backend exists. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

const STATUS = ["Submitted", "Assigned", "In progress", "Completed"];
const CATEGORIES = ["Plumbing", "Electrical", "Furniture", "Internet", "Cleaning", "Security", "Other"];
const HOURS = { Minor: 72, Major: 48, Urgent: 24 };   // time before escalation to Student Affairs
const H = 3600000;

let users = store.get("hl_u2", []);
let techs = store.get("hl_t", []);
let complaints = store.get("hl_c3", []);
const sid = (() => { try { return sessionStorage.getItem("hl_s"); } catch { return null; } })();
let user = users.find(u => u.role + ":" + u.email === sid) || null;
const hk = x => (x || "").trim().toLowerCase();
const mine = () => complaints.filter(c => c.em === user.email);
const scope = () => user.role === "manager" ? complaints.filter(c => hk(c.hostel) === hk(user.hostel)) : complaints;
const HOME = { student: "#/home", manager: "#/mhome", affairs: "#/ahome" };
let draft = { step: 1, media: [] };
const save = () => { store.set("hl_u2", users); store.set("hl_t", techs); store.set("hl_c3", complaints); try { sessionStorage.setItem("hl_s", user ? user.role + ":" + user.email : ""); } catch {} };
const find = id => complaints.find(c => c.id === id);
const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago"; };
const initials = n => (n || "?").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();
const toast = t => { const e = document.createElement("div"); e.className = "toast"; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); };
const isLate = c => c.status < 3 && Date.now() > c.deadline;

function badge(c) {
  if (isLate(c)) return '<span class="tag red">Escalated</span>';
  return `<span class="tag ${c.status === 3 ? "green" : c.status ? "amber" : ""}">${STATUS[c.status]}</span>`;
}
function listItem(c) {
  const staff = user.role !== "student";
  return `<a class="item${isLate(c) ? " late" : ""}" href="#/${staff ? "m" : "c"}/${c.id}">
    <div class="avatar">${initials(staff ? c.by : user.name)}</div>
    <div class="grow"><b>${staff ? esc(c.by) + " · " + esc(place(c)) : esc(c.category) + " · " + esc(c.urgency)}</b><small>${staff ? esc(c.hostel) + " · " + esc(c.category) + ": " : ""}${esc(c.desc)}</small></div>
    <div style="text-align:right">${user.role === "manager" && !c.seen ? '<span class="tag new">New</span>' : badge(c)}<small>${staff ? esc(c.urgency) : ago(c.created)}</small></div></a>`;
}
const topbar = (title, sub = "", back = true) => `<header class="top">${back ? '<button class="back" onclick="goBack()" aria-label="Back">←</button>' : ""}<div class="grow"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div></header>`;

const goBack = () => (history.length > 1 ? history.back() : (location.hash = "#/home"));
const msgHTML = m => `<div class="msg ${m.from === "system" ? "sys" : m.from === user.role ? "me" : ""}">${esc(m.t)}<small>${ago(m.at)}</small></div>`;

/* ---------- screens ---------- */
const screens = {
  welcome() {
    return `<section class="wel"><div class="logo"></div><h1>Hostelink.</h1><a class="note" href="#/role">Tap to continue</a></section>`;
  },
  signup(role) {
    const f = (id, l, ph = "", t = "text", ex = "") => `<label for="${id}">${l}</label><input id="${id}" type="${t}" placeholder="${ph}" ${ex}>`;
    return `<div class="lgn"><div class="lt"><button class="back" onclick="goBack()" aria-label="Back">←</button><div class="logo"></div><h2>Hostelink.</h2></div>
      <form class="sheet lg" id="signup" novalidate><i class="grab"></i><p class="sm">${ROLES[role]} account</p><h1>Create your account</h1>
      ${f("n", "Full name", "", "text", 'autocomplete="name"')}${f("e", "Email", "", "email", 'autocomplete="email"')}${f("p", "Phone number", "", "tel", 'autocomplete="tel"')}
      ${role !== "affairs" ? hostelFields("", "", "", "", role === "manager" ? "Hostel you manage" : "Hostel", role === "student") : ""}
      ${f("pw", "Password", "At least 6 characters", "password", 'autocomplete="new-password"')}
      <div class="err" id="er" hidden></div><button class="btn dark">Create account</button>
      <p class="note foot">Already have an account? <a href="#/login/${role}">Log in</a></p></form></div>`;
  },
  home() {
    const recent = [...mine()].sort((a, b) => b.created - a.created).slice(0, 5);
    const cnt = f => mine().filter(f).length;
    return `<header class="top"><div class="grow"><h1>Hi there, ${esc(user.name.split(" ")[0])}</h1><p>What's on your mind today?</p></div>
      <a class="avatar" href="#/profile" aria-label="Profile">${initials(user.name)}</a></header>
      <div class="cols"><div>
      <a class="hero" href="#/new"><div class="ph"><span class="go">→</span><h2>Do you have a complaint to file?</h2></div></a>
      <div class="stats"><div class="stat"><b>${cnt(c => c.status < 3 && !isLate(c))}</b><span>Open</span></div><div class="stat"><b>${cnt(c => c.status === 3)}</b><span>Resolved</span></div><div class="stat red"><b>${cnt(isLate)}</b><span>Escalated</span></div></div></div>
      <div><h3 class="first">Recent complaints</h3>
      ${recent.length ? recent.map(listItem).join("") : '<div class="empty">No complaints yet. Use the card to file your first one.</div>'}</div></div>`;
  },
  complaints() {
    const m = mine(), open = m.filter(c => c.status < 3), done = m.filter(c => c.status === 3);
    const sec = (t, a) => a.length ? `<h3>${t}</h3><div class="grid2">${a.map(listItem).join("")}</div>` : "";
    return topbar("Your complaints", "", false) + `<div class="card total"><span>Total complaints filed</span><b>${m.length}</b></div>` + (m.length ? sec("Open", open) + sec("Resolved", done) : '<div class="empty">You have not filed any complaints.</div>');
  },
  new() {
    const d = draft;
    const dots = `<div class="dots"><i class="on"></i><i class="${d.step === 2 ? "on" : ""}"></i></div>`;
    if (d.step === 1) return `<header class="top fm"><button class="back" onclick="goBack()" aria-label="Back">←</button><div class="grow ctr"><b>Form</b></div><span style="width:30px"></span></header>${dots}<h1 class="big">Can you give us some key details about your situation?</h1>
      <form id="f1" novalidate>
        ${hostelFields(d.hostel ?? user.hostel, d.block ?? user.block, d.room ?? user.room, d.loc ?? user.loc)}
        <label>Category</label><select id="c">${CATEGORIES.map(x => `<option ${d.category === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        <label>How urgent is it?</label><select id="u">${Object.keys(HOURS).map(x => `<option ${d.urgency === x ? "selected" : ""} value="${x}">${x} – fixed within ${HOURS[x]} hours</option>`).join("")}</select>
        <label>Describe the issue</label><textarea id="d" required>${esc(d.desc ?? "")}</textarea>
        <div class="err" id="er"></div>
        <div class="row"><button type="button" class="btn alt" id="b0">← Back</button><button class="btn dark">Continue →</button></div></form>`;
    return `${topbar("Add proof", "Photos, video or audio help us fix it faster")}${dots}
      <label class="upload" for="m">+ Upload photos, video or audio</label>
      <input id="m" type="file" accept="image/*,video/*,audio/*" multiple hidden>
      <div class="files" id="fl"></div>
      <div class="row"><button class="btn alt" id="bk">Back</button><button class="btn" id="sb">Submit complaint</button></div>`;
  },
  detail(id) {
    const c = find(id); if (!c) return screens.complaints();
    const pct = c.status / 3 * 86;
    return `${topbar(esc(place(c)), esc(c.category) + " · " + esc(c.urgency))}
    <div class="cols"><div><div class="card"><b>Complaint</b><p style="margin-top:6px;color:var(--mute)">${esc(c.desc)}</p>
      ${c.media.length ? `<div class="files">${c.media.map(m => m.url ? `<img src="${m.url}" alt="">` : `<span>${esc(m.name)}</span>`).join("")}</div>` : ""}</div>
    <h3>Progress</h3><div class="card">
      ${trackHTML(c)}</div></div><div><h3 class="first">Time left to resolve</h3>
    <div class="timer" id="tm" data-d="${c.deadline}" data-done="${c.status === 3}"><b>--:--:--</b><span></span></div>
    <a class="btn dark" href="#/chat/${c.id}">Go to messages</a>
    ${c.status === 3 ? `<a class="btn" href="#/rate/${c.id}">${c.rating ? "Your rating: " + "★".repeat(c.rating.stars) : "Rate this fix"}</a>` : ""}</div></div>`;
  },
  chat(id) {
    const c = find(id); if (!c) return screens.complaints();
    return `<section class="chatwrap"><header class="chathead"><button class="back" onclick="goBack()" aria-label="Back">←</button>
      <div class="avatar mgr">${user.role === "student" ? "HM" : initials(c.by)}</div><div class="grow"><b>${user.role === "student" ? "Hostel manager" : esc(c.by)}</b><small>${esc(c.category)} complaint · ${esc(place(c))}</small></div></header>
      <div class="chat" id="ch" aria-live="polite">${c.msgs.length ? c.msgs.map(msgHTML).join("") : '<div class="empty" id="em">No messages yet. Say hello to your hostel manager.</div>'}</div>
      <form class="send" id="sf"><input id="mt" placeholder="Type a message" autocomplete="off" aria-label="Message"><button class="sendbtn" aria-label="Send">➤</button></form></section>`;
  },
  rate(id) {
    const c = find(id); if (!c) return screens.complaints();
    return `${topbar("Rate the resolution")}<div class="card"><p style="text-align:center">How was the fix for your ${esc(c.category.toLowerCase())} issue?</p>
      <div class="stars" id="st">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} stars" class="${c.rating && n <= c.rating.stars ? "on" : ""}">★</button>`).join("")}</div>
      <label for="fb">Tell us more</label><textarea id="fb">${esc(c.rating?.text ?? "")}</textarea>
      <button class="btn" id="rs">Send feedback</button></div>`;
  },
  profile() { return profileForm(); }
};

/* ---------- wiring per screen ---------- */
const wire = {
  signup(role) {
    bindHostel();
    $("#signup").onsubmit = async e => {
      e.preventDefault();
      const v = id => ($("#" + id)?.value || "").trim(), fail = m => { const er = $("#er"); er.hidden = false; er.textContent = m; };
      const u = { role, name: v("n"), email: v("e").toLowerCase(), phone: v("p"), ...(role !== "affairs" ? hv(v) : {}) }, pw = $("#pw").value;
      const need = ["name", "email", "phone"].concat(role !== "affairs" ? ["hostel"] : [], role === "student" ? (u.hostel === OFF ? ["loc"] : ["block", "room"]) : []);
      if (need.some(k => !u[k])) return fail("Please fill in every field.");
      if (!/^\S+@\S+\.\S+$/.test(u.email)) return fail("Enter a valid email address.");
      if (pw.length < 6) return fail("Password must be at least 6 characters.");
      if (users.some(x => x.role === role && x.email === u.email)) return fail("That email already has an account. Please log in.");
      u.pw = await sha(u.email + pw); users.push(u); user = u; save(); location.hash = HOME[role];
    };
  },
  new() {
    $("#b0")?.addEventListener("click", goBack);
    bindHostel();
    if (draft.step === 1) $("#f1").onsubmit = e => {
      e.preventDefault();
      const v = id => $("#" + id).value.trim();
      const o = hv(v); if (!hostelOk(o) || !v("d")) return $("#er").textContent = "Pick your hostel, give your room (or location if off campus) and describe the issue.";
      Object.assign(draft, { ...(o.hostel === OFF ? { ...o, block: "", room: "" } : { ...o, loc: "" }), category: v("c"), urgency: v("u"), desc: v("d"), step: 2 });
      render();
    };
    else {
      const paint = () => $("#fl").innerHTML = draft.media.map(m => m.url ? `<img src="${m.url}" alt="">` : `<span>${esc(m.name)}</span>`).join("");
      paint();
      $("#m").onchange = e => {
        [...e.target.files].forEach(f => {
          if (f.size > 25e6) return toast(f.name + " is over 25 MB");
          const m = { name: f.name, type: f.type, url: "" };
          draft.media.push(m);
          if (f.type.startsWith("image") && f.size < 1.5e6) { const r = new FileReader(); r.onload = () => { m.url = r.result; paint(); }; r.readAsDataURL(f); }
        });
        paint();
      };
      $("#bk").onclick = () => { draft.step = 1; render(); };
      $("#sb").onclick = () => {
        const now = Date.now();
        const c = { id: "c" + now, em: user.email, hist: [now], by: user.name, hostel: draft.hostel, block: draft.block, room: draft.room, loc: draft.loc || "", seen: false, tech: null, done: null, category: draft.category, urgency: draft.urgency, desc: draft.desc, status: 0, created: now, deadline: now + HOURS[draft.urgency] * H, msgs: [], media: draft.media, rating: null };
        complaints.unshift(c); save(); draft = { step: 1, media: [] };
        toast("Complaint submitted"); location.hash = "#/c/" + c.id;
      };
    }
  },
  detail(id) {
    const f = document.querySelector(".fill");
    requestAnimationFrame(() => requestAnimationFrame(() => f && (f.style.width = f.dataset.w)));
    const b = $("#adv");
    if (b) b.onclick = () => { const c = find(id); c.status = Math.min(3, c.status + 1); save(); render(); };
  },
  chat(id) {
    const c = find(id), box = $("#ch");
    const down = () => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
    box.scrollTop = box.scrollHeight;
    const add = m => { $("#em")?.remove(); box.insertAdjacentHTML("beforeend", msgHTML(m)); down(); };
    $("#sf").onsubmit = e => {
      e.preventDefault();
      const inp = $("#mt"), t = inp.value.trim(); if (!t) return;
      const m = { t, from: user.role, at: Date.now() }; c.msgs.push(m); save(); add(m); inp.value = "";

    };
    if (matchMedia("(hover:hover)").matches) $("#mt").focus();
  },
  rate(id) {
    const c = find(id); let n = c.rating?.stars || 0;
    $("#st").onclick = e => { const b = e.target.closest("button"); if (!b) return; n = +b.dataset.n; document.querySelectorAll("#st button").forEach(x => x.classList.toggle("on", +x.dataset.n <= n)); };
    $("#rs").onclick = () => { if (!n) return toast("Pick a star rating first"); c.rating = { stars: n, text: $("#fb").value.trim() }; save(); toast("Thanks for your feedback"); location.hash = "#/c/" + id; };
  },
  profile() { wireProfile(); }
};

/* ---------- countdown ---------- */
function tick() {
  const t = $("#tm"); if (!t) return;
  const left = +t.dataset.d - Date.now();
  if (t.dataset.done === "true") { t.querySelector("b").textContent = "Resolved"; t.querySelector("span").textContent = ""; return; }
  if (left <= 0) {
    t.classList.add("late");
    t.querySelector("b").textContent = "00:00:00";
    t.querySelector("span").textContent = "Time is up. This complaint has been escalated to Student Affairs.";
    return;
  }
  const p = n => String(n).padStart(2, "0");
  t.querySelector("b").textContent = `${p(Math.floor(left / H))}:${p(Math.floor(left / 60000) % 60)}:${p(Math.floor(left / 1000) % 60)}`;
  t.querySelector("span").textContent = "hours : minutes : seconds";
}
setInterval(tick, 1000);

/* ---------- staff + auth screens ---------- */
const flt = { tab: "all", cat: "all", host: "all", q: "", sort: "urg" };
const TABS = [["fixed", "Fixed"], ["due", "Due"], ["overdue", "Overdue"], ["all", "All"]];
const NAV = {
  student: [["home", "Home"], ["complaints", "My complaints", "Complaints"], ["new", "New complaint", "New"], ["profile", "Profile"]],
  manager: [["mhome", "Home"], ["tasks", "Task inbox", "Inbox"], ["techs", "Technicians"], ["profile", "Profile"]],
  affairs: [["ahome", "Dashboard"], ["archive", "Archive"], ["profile", "Profile"]]
};
const IC = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.4c2.2.8 3.5 2.7 3.5 5.6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10h14V9M10 13h4"/>'
};
const ICON_OF = { home: "home", mhome: "home", ahome: "dash", complaints: "chat", new: "plus", tasks: "inbox", techs: "team", archive: "archive", profile: "user" };
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IC[ICON_OF[k] || "chat"]}</svg>`;
/* which nav tab to light up – detail pages belong to the list they were opened from */
let lastTop = null;
const navKey = r => {
  const mg = user.role === "manager", keys = NAV[user.role].map(n => n[0]);
  if (keys.includes(r)) return (lastTop = r);
  const dflt = { c: "complaints", rate: "complaints", chat: mg ? "tasks" : "complaints", m: mg ? "tasks" : "archive" }[r];
  const from = { c: ["home", "complaints"], chat: ["mhome", "tasks", "home", "complaints"], m: ["ahome", "archive", "mhome", "tasks"] }[r] || [];
  return keys.includes(lastTop) && from.includes(lastTop) ? lastTop : dflt;
};
const rank = c => (c.status === 3 ? 100 : 0) + (isLate(c) ? 0 : 10) + ["Urgent", "Major", "Minor"].indexOf(c.urgency);
const byRank = (a, b) => rank(a) - rank(b) || a.deadline - b.deadline;
const hostels = () => [...new Set(scope().map(c => c.hostel).filter(Boolean))];
const stat = l => ({ fixed: l.filter(c => c.status === 3).length, overdue: l.filter(isLate).length, due: l.filter(c => c.status < 3 && !isLate(c)).length });
const weekly = (s, t) => { const n = s.fixed + s.due + s.overdue || 1; return `<div class="hero week"><div class="ph"><b>${t}</b><h2>${s.fixed + s.due + s.overdue} complaints</h2><div class="seg"><i style="width:${s.fixed / n * 100}%;background:var(--green)"></i><i style="width:${s.due / n * 100}%;background:var(--amber)"></i><i style="width:${s.overdue / n * 100}%;background:var(--red)"></i></div><div class="leg"><span><u class="g"></u>Fixed ${s.fixed}</span><span><u class="a"></u>Due ${s.due}</span><span><u class="r"></u>Overdue ${s.overdue}</span></div></div></div>`; };
const match = c => (flt.tab === "all" || (flt.tab === "fixed" ? c.status === 3 : flt.tab === "overdue" ? isLate(c) : c.status < 3 && !isLate(c))) && (flt.cat === "all" || c.category === flt.cat) && (flt.host === "all" || c.hostel === flt.host) && (!flt.q || (c.by + c.room + c.desc + c.hostel + c.category).toLowerCase().includes(flt.q.toLowerCase()));
const boardList = () => { const l = scope().filter(match).sort(flt.sort === "new" ? (a, b) => b.created - a.created : flt.sort === "cat" ? (a, b) => a.category.localeCompare(b.category) || byRank(a, b) : byRank); return l.length ? l.map(listItem).join("") : '<div class="empty">No complaints match.</div>'; };
const board = (t, sub) => `${topbar(t, sub, false)}<div class="chips seg-ctl" id="tabs">${TABS.map(x => `<button class="chip ${flt.tab === x[0] ? "on" : ""}" data-t="${x[0]}">${x[1]}</button>`).join("")}</div>
  <div class="row filters"><input id="q" type="search" placeholder="Search name, room…" aria-label="Search" value="${esc(flt.q)}"><select id="fc" aria-label="Category"><option value="all">All categories</option>${CATEGORIES.map(x => `<option ${flt.cat === x ? "selected" : ""}>${x}</option>`).join("")}</select><select id="fh" aria-label="Hostel"><option value="all">All hostels</option>${hostels().map(x => `<option ${flt.host === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select><select id="fs" aria-label="Sort">${[["urg", "Sort: urgency"], ["new", "Sort: newest"], ["cat", "Sort: category"]].map(x => `<option value="${x[0]}" ${flt.sort === x[0] ? "selected" : ""}>${x[1]}</option>`).join("")}</select></div>
  <div class="grid2" id="bl">${boardList()}</div>`;
const wireBoard = () => {
  const up = () => $("#bl").innerHTML = boardList();
  $("#tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; flt.tab = b.dataset.t; document.querySelectorAll("#tabs .chip").forEach(x => x.classList.toggle("on", x === b)); segMove(); up(); };
  $("#q").oninput = e => { flt.q = e.target.value; up(); };
  $("#fc").onchange = e => { flt.cat = e.target.value; up(); };
  $("#fh").onchange = e => { flt.host = e.target.value; up(); };
  $("#fs").onchange = e => { flt.sort = e.target.value; up(); };
};
const dot = h => { if (h === "all") return ""; const t = stat(complaints.filter(c => c.hostel === h)); return `<i class="dot" style="background:${t.overdue ? "var(--red)" : t.due ? "var(--amber)" : "var(--green)"}"></i>`; };
const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "–";
const trackHTML = c => `<div class="track"><div class="fill" style="width:0" data-w="${c.status / 3 * 86}%"></div>${STATUS.map((s, i) => `<div class="step ${i <= c.status ? "on" : ""}"><i></i>${s}${c.hist?.[i] ? `<small>${ago(c.hist[i])}</small>` : ""}</div>`).join("")}</div>`;

const segMove = () => { const t = $("#tabs"), b = t?.querySelector(".on"); if (b) { t.style.setProperty("--x", b.offsetLeft + "px"); t.style.setProperty("--w", b.offsetWidth + "px"); } };
const countUp = () => document.querySelectorAll(".stat b").forEach(el => {
  const m = el.textContent.match(/^(\d+)(.*)$/); if (!m || +m[1] === 0) return;
  const n = +m[1], t0 = performance.now(), f = t => { const p = Math.min(1, (t - t0) / 800); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 4))) + m[2]; if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
const appBadge = () => { try { const n = !user ? 0 : user.role === "manager" ? newCount() : user.role === "affairs" ? complaints.filter(isLate).length : 0; n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch {} };
document.addEventListener("click", e => { if (e.target.closest("button,.chip,.opt,.item,.nav a,.hero")) navigator.vibrate?.(6); });
const THEME_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="i-moon"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></g><g class="i-sun"><circle cx="12" cy="12" r="4.5"/><path d="M11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM17.7 4.2l1.4 1.4-2.1 2.1-1.4-1.4zM5.6 19.8l-1.4-1.4 2.1-2.1 1.4 1.4z"/></g></svg>';
const themeBtn = `<button class="tbtn" data-theme-toggle aria-label="Switch between light and dark mode"><span class="ic">${THEME_SVG}</span><span class="lb"><span class="lf">Light / dark</span><span class="ls">Theme</span></span></button>`;
const applyTheme = () => {
  const p = store.get("hl_theme", "system"), d = p === "dark" || (p !== "light" && matchMedia("(prefers-color-scheme:dark)").matches);
  document.documentElement.dataset.theme = d ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", d ? "#000000" : "#f4f6fa");
};
document.addEventListener("click", e => { if (e.target.closest("[data-theme-toggle]")) { store.set("hl_theme", document.documentElement.dataset.theme === "dark" ? "light" : "dark"); applyTheme(); } });
matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change", applyTheme);
applyTheme(); $("#tf").innerHTML = THEME_SVG;
const HOSTELS = ["Faith Hostel", "Pod Living", "Emerald", "Amethyst", "Cooperative Kings", "EDC", "Cooperative Queens", "Redwood", "Pearl Hostel", "Trinity", "Queen Mary", "Cedar", "Trezadel", "Eleko", "Asterhall", "Off Campus"];
const OFF = "Off Campus";
const place = c => c.hostel === OFF ? (c.loc || "Off campus") : "Room " + c.room;
const newCount = () => user?.role === "manager" ? scope().filter(c => !c.seen).length : 0;
const hostelFields = (h = "", b = "", r = "", loc = "", label = "Hostel", full = true) => {
  const opts = [...HOSTELS, ...(h && !HOSTELS.includes(h) ? [h] : [])];
  return `<label for="h">${label}</label><select id="h"><option value="">Select hostel</option>${opts.map(x => `<option ${x === h ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>` + (full ? `
  <div id="oc" ${h === OFF ? "" : "hidden"}><label for="lc">Your location</label><input id="lc" value="${esc(loc)}" placeholder="Street, area, landmark" autocomplete="street-address"></div>
  <div class="row" id="bl" ${h && h !== OFF ? "" : "hidden"}><div><label for="b">Block</label><input id="b" value="${esc(b)}" placeholder="e.g. B"></div><div><label for="r">Room number</label><input id="r" value="${esc(r)}" placeholder="e.g. 419"></div></div>` : "");
};
const bindHostel = () => { const h = $("#h"); if (!h) return; h.onchange = () => { const off = h.value === OFF; if ($("#oc")) $("#oc").hidden = !off; if ($("#bl")) $("#bl").hidden = off || !h.value; }; };
const hv = v => ({ hostel: v("h"), block: v("b"), room: v("r"), loc: v("lc") });
const hostelOk = (o, full = true) => !!o.hostel && (!full || (o.hostel === OFF ? !!o.loc : !!(o.block && o.room)));
/* ---- custom dropdown: every <select> in the app becomes a styled sheet picker ---- */
const CHEV = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg>';
const enhanceSelects = () => document.querySelectorAll("#app select").forEach(sel => {
  if (sel.parentElement.classList.contains("dd")) return;
  const w = document.createElement("div"); w.className = "dd"; sel.before(w); w.append(sel);
  sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
  const b = document.createElement("button"); b.type = "button"; b.className = "dd-btn"; b.setAttribute("aria-haspopup", "dialog");
  if (sel.id) b.id = sel.id + "-btn";
  const upd = () => { const o = sel.selectedOptions[0]; b.innerHTML = `<span>${esc(o ? o.textContent : "")}</span>${CHEV}`; b.classList.toggle("ph", !sel.value); };
  upd(); sel.addEventListener("change", upd); w.append(b);
  if (sel.id) document.querySelector(`label[for="${sel.id}"]`)?.setAttribute("for", b.id);
});
const openDD = btn => {
  const sel = btn.parentElement.querySelector("select"), title = document.querySelector(`label[for="${btn.id}"]`)?.textContent || sel.getAttribute("aria-label") || "Select";
  const opts = [...sel.options].filter(o => o.value !== ""), bg = document.createElement("div"); bg.className = "sh-bg";
  bg.innerHTML = `<div class="sh" role="dialog" aria-label="${esc(title)}"><div class="sh-grab"></div><h4>${esc(title)}</h4>${opts.length > 8 ? '<input class="sh-s" type="search" placeholder="Search" aria-label="Search">' : ""}<div class="sh-list" role="listbox">${opts.map(o => `<button type="button" role="option" class="sh-opt ${o.value === sel.value ? "on" : ""}" data-v="${esc(o.value)}">${esc(o.textContent)}</button>`).join("")}</div></div>`;
  const key = e => { if (e.key === "Escape") close(); };
  const close = () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; bg.classList.add("out"); setTimeout(() => { bg.remove(); btn.focus({ preventScroll: true }); }, 200); };
  bg.onclick = e => {
    if (e.target === bg) return close();
    const o = e.target.closest(".sh-opt"); if (!o) return;
    sel.value = o.dataset.v; sel.dispatchEvent(new Event("change")); navigator.vibrate?.(6); close();
  };
  bg.querySelector(".sh-s")?.addEventListener("input", e => { const q = e.target.value.toLowerCase(); bg.querySelectorAll(".sh-opt").forEach(b => b.hidden = !b.textContent.toLowerCase().includes(q)); });
  document.addEventListener("keydown", key); document.body.style.overflow = "hidden"; document.body.append(bg);
  const cur = bg.querySelector(".sh-opt.on") || bg.querySelector(".sh-opt"); cur?.scrollIntoView?.({ block: "center" }); cur?.focus({ preventScroll: true });
};
document.addEventListener("click", e => { const b = e.target.closest(".dd-btn"); if (b) openDD(b); });
const sha = async p => { try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hl:" + p)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); } catch { return "x" + btoa(unescape(encodeURIComponent(p))); } };
const sweep = () => { let ch = false; complaints.forEach(c => { if (!c.esc && isLate(c)) { c.esc = Date.now(); ch = true; } }); if (ch) save(); };
setInterval(sweep, 20000);
const TRADES = ["Plumber", "Electrician", "Carpenter", "IT", "Cleaner", "Security", "General"];
const techLabel = t => `${t.name} (${t.trade})`;
const myTechs = () => techs.filter(t => hk(t.hostel) === hk(user.hostel)).map(techLabel);
/* "Add technician" sheet – used on the Technicians page and from a complaint's Assign field */
function openTechSheet(done) {
  const opener = document.activeElement, bg = document.createElement("div"); let trade = TRADES[0];
  bg.className = "sh-bg";
  bg.innerHTML = `<form class="sh" role="dialog" aria-modal="true" aria-label="Add technician" novalidate><div class="sh-grab"></div><h4>Add technician</h4><div class="sh-body">
    <label for="tn">Name</label><input id="tn" autocomplete="off" placeholder="e.g. Chinedu Okafor">
    <label for="tp">Phone number <span class="opt-hint">(optional)</span></label><input id="tp" type="tel" autocomplete="off" placeholder="e.g. 0803 000 0000">
    <label id="tl">Trade</label><div class="trades" role="radiogroup" aria-labelledby="tl">${TRADES.map((x, i) => `<button type="button" role="radio" aria-checked="${!i}" class="chip${i ? "" : " on"}" data-t="${x}">${x}</button>`).join("")}</div>
    <div class="err" id="te" hidden></div>
    <div class="row"><button type="button" class="btn alt" id="tx">Cancel</button><button class="btn">Add technician</button></div></div></form>`;
  const key = e => { if (e.key === "Escape") close(); };
  const close = () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; bg.classList.add("out"); setTimeout(() => { bg.remove(); opener?.focus?.({ preventScroll: true }); }, 200); };
  bg.onclick = e => {
    if (e.target === bg) return close();
    const c = e.target.closest(".chip"); if (!c) return;
    trade = c.dataset.t;
    bg.querySelectorAll(".chip").forEach(x => { x.classList.toggle("on", x === c); x.setAttribute("aria-checked", x === c); });
  };
  bg.querySelector("#tx").onclick = close;
  bg.querySelector("form").onsubmit = e => {
    e.preventDefault();
    const name = bg.querySelector("#tn").value.trim().replace(/\s+/g, " "), er = bg.querySelector("#te"), fail = m => { er.hidden = false; er.textContent = m; };
    if (!name) { fail("Enter the technician's name."); return bg.querySelector("#tn").focus(); }
    if (techs.some(t => hk(t.hostel) === hk(user.hostel) && hk(t.name) === hk(name) && t.trade === trade)) return fail(name + " is already on your list as " + trade.toLowerCase() + ".");
    const t = { id: "t" + Date.now(), name, trade, phone: bg.querySelector("#tp").value.trim(), hostel: user.hostel };
    techs.push(t); save(); close(); toast("Technician added"); done?.(t);
  };
  document.addEventListener("keydown", key); document.body.style.overflow = "hidden"; document.body.append(bg);
  bg.querySelector("#tn").focus({ preventScroll: true });
}
const allHostels = () => [...new Set([...users.map(u => u.hostel), ...complaints.map(c => c.hostel)].filter(Boolean))];
const ROLES = { student: "Student", manager: "Hostel Manager", affairs: "Student Affairs Officer" };
const exportCsv = () => {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["ID", "Student", "Hostel", "Block", "Room", "Category", "Urgency", "Status", "Technician", "Filed", "Completed", "Rating", "Description"], ...scope().filter(match).map(c => [c.id, c.by, c.hostel, c.block, c.room || c.loc, c.category, c.urgency, STATUS[c.status], c.tech, new Date(c.created).toISOString(), c.done ? new Date(c.done).toISOString() : "", c.rating?.stars, c.desc])];
  const file = new File([rows.map(r => r.map(q).join(",")).join("\n")], "hostellink-archive.csv", { type: "text/csv" });
  if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: "HostelLink archive" }).catch(() => {});
  else { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
};
const profileForm = () => {
  const f = (id, l, v, t = "text") => `<label for="${id}">${l}</label><input id="${id}" type="${t}" value="${esc(v)}">`, r = user.role;
  return `${topbar("Profile", ROLES[r], false)}<div class="card" style="text-align:center"><div class="avatar big-av">${initials(user.name)}</div><b>${esc(user.name)}</b><div class="note">${esc(user.email)}</div></div>
    <form id="pf" class="card" style="margin-top:14px" novalidate>${f("n", "Full name", user.name)}${f("p", "Phone number", user.phone, "tel")}${r !== "affairs" ? hostelFields(user.hostel, user.block, user.room, user.loc, r === "student" ? "Hostel" : "Hostel you manage", r === "student") : ""}
    <div class="err" id="er" hidden></div><button class="btn">Save changes</button></form><button class="btn alt" id="lo">Log out</button>`;
};
const wireProfile = () => {
  bindHostel();
  $("#pf").onsubmit = e => {
    e.preventDefault(); const v = id => ($("#" + id)?.value || "").trim();
    const o = hv(v);
    if (!v("n") || (user.role !== "affairs" && !hostelOk(o, user.role === "student"))) { const er = $("#er"); er.hidden = false; er.textContent = "Please fill in every field."; return; }
    Object.assign(user, { name: v("n"), phone: v("p") }, user.role === "affairs" ? {} : user.role === "manager" ? { hostel: o.hostel } : o.hostel === OFF ? { ...o, block: "", room: "" } : { ...o, loc: "" });
    if (user.role === "student") complaints.forEach(c => { if (c.em === user.email) c.by = user.name; });
    save(); toast("Profile updated"); render();
  };
  $("#lo").onclick = () => { user = null; save(); location.hash = "#/welcome"; };
};

Object.assign(screens, {
  role() {
    const o = [["student", "Students", "Do you have some complaints to meet?"], ["manager", "Hostel Manager", "Do you have some complaints to organize?"], ["affairs", "Student Affairs Officer", "Do you have some complaints to analyze?"]];
    return `<div class="lgn"><div class="lt"><button class="back" onclick="goBack()" aria-label="Back">←</button><div class="logo"></div></div>
      <form class="sheet lg" id="rf"><i class="grab"></i><p class="sm">User specification</p><h1>What kind of user are you?</h1>${o.map((x, i) => `<label class="opt"><input type="radio" name="role" value="${x[0]}" ${i ? "" : "checked"}><span><b>${x[1]}</b><small>${x[2]}</small></span></label>`).join("")}<button class="btn dark">Proceed</button></form></div>`;
  },
  login(role) {
    return `<div class="lgn"><div class="lt"><button class="back" onclick="goBack()" aria-label="Back">←</button><div class="logo"></div></div>
      <form class="sheet lg" id="lf" novalidate><i class="grab"></i><p class="sm">Hi ${ROLES[role]}!</p><h1>Please log in</h1>
      <label class="sr" for="le">Email</label><input id="le" type="email" autocomplete="email" placeholder="Enter your ${role === "student" ? "student " : ""}email">
      <label class="sr" for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" placeholder="Enter your password">
      <a class="forgot" href="#/forgot/${role}">Forgot password?</a>
      <div class="err" id="er" hidden></div><button class="btn dark">Continue</button>
      <p class="note foot">Don't have an account? <a href="#/signup/${role}">Create an account</a></p></form></div>`;
  },
  forgot(role) {
    return `<div class="lgn"><div class="lt"><button class="back" onclick="goBack()" aria-label="Back">←</button><div class="logo"></div></div>
      <form class="sheet lg" id="ff" novalidate><i class="grab"></i><p class="sm">Account recovery</p><h1>Reset password</h1>
      <label for="fe">Email</label><input id="fe" type="email"><label for="fp">Phone number on your account</label><input id="fp" type="tel"><label for="fn">New password</label><input id="fn" type="password" placeholder="At least 6 characters">
      <div class="err" id="er" hidden></div><button class="btn dark">Reset password</button><p class="note foot"><a href="#/login/${role}">Back to log in</a></p></form></div>`;
  },
  techs() {
    const l = techs.filter(t => hk(t.hostel) === hk(user.hostel));
    const active = t => complaints.filter(c => c.tech === techLabel(t) && c.status < 3 && hk(c.hostel) === hk(user.hostel)).length;
    const row = t => { const n = active(t); return `<div class="item" style="cursor:default"><div class="avatar">${initials(t.name)}</div><div class="grow"><b>${esc(t.name)}</b><small>${esc(t.trade)}${t.phone ? " · " + esc(t.phone) : ""}</small><small>${n ? n + " active complaint" + (n > 1 ? "s" : "") : "Available"}</small></div><button class="btn sm alt" data-x="${t.id}" aria-label="Remove ${esc(t.name)}">Remove</button></div>`; };
    return `<header class="top"><div class="grow"><h1>Technicians</h1><p>${esc(user.hostel)}</p></div><button class="btn sm addbtn" data-add>+ Add technician</button></header>`
      + (l.length ? `<h3 class="first">Your technicians (${l.length})</h3><div class="grid2">${l.map(row).join("")}</div>` : '<div class="empty">No technicians yet. Add the people you assign complaints to.<button class="btn" data-add>+ Add technician</button></div>');
  },
  mhome() {
    const todo = scope().filter(c => c.status < 3).sort(byRank).slice(0, 6);
    return `<header class="top"><div class="grow"><h1>Hi there, ${esc(user.name.split(" ")[0])}</h1><p>Here are the complaints we have today</p></div><a class="avatar" href="#/profile">${initials(user.name)}</a></header>
      <div class="cols"><div>${newCount() ? `<a class="banner" href="#/tasks"><span><b>${newCount()} new complaint${newCount() > 1 ? "s" : ""}</b> in ${esc(user.hostel)}</span><span>View →</span></a>` : ""}${weekly(stat(scope()), "Weekly update")}<a class="btn" href="#/tasks">Open task inbox</a></div>
      <div><h3 class="first">Today's complaints</h3>${todo.length ? todo.map(listItem).join("") : '<div class="empty">All caught up.</div>'}</div></div>`;
  },
  tasks() { return board("Task inbox", "Sorted by urgency, overdue first"); },
  archive() { return board("Complaint archive", "Every complaint, searchable") + '<button class="btn alt" id="csv">Export CSV</button>'; },
  mdetail(id) {
    const c = find(id); if (!c || (user.role === "manager" && hk(c.hostel) !== hk(user.hostel))) return screens.tasks();
    const mg = user.role === "manager", late = isLate(c);
    const opts = [...new Set([c.tech, ...myTechs()].filter(Boolean))];
    const ctrl = `<h3>Manage</h3><div class="card"><label for="tc">Assign technician</label><select id="tc"><option value="">Choose…</option>${opts.map(t => `<option ${c.tech === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select><button type="button" class="btn sm alt addt" id="addt">+ Add technician</button>
      <label for="sc">Update status</label><select id="sc">${STATUS.map((x, i) => `<option value="${i}" ${i === c.status ? "selected" : ""}>${x}</option>`).join("")}</select><button class="btn" id="up">Save update</button></div>`;
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`;
    return `${topbar(esc(place(c)), esc(c.hostel) + " · " + esc(c.by))}
      <div class="cols"><div><div class="card">${kv("Complaint", c.category)}${kv("Urgency level", c.urgency)}${kv("Status", STATUS[c.status])}${kv("Technician", c.tech || "Not assigned")}${c.hostel === OFF ? kv("Location", c.loc) : kv("Block", c.block || "-")}</div>
      <h3>Description</h3><div class="card">${esc(c.desc)}${c.media.length ? `<div class="files">${c.media.map(m => m.url ? `<img src="${m.url}" alt="">` : `<span>${esc(m.name)}</span>`).join("")}</div>` : ""}</div>
      <h3>Progress</h3><div class="card">${trackHTML(c)}</div></div>
      <div><h3 class="first">Time left to resolve</h3><div class="timer" id="tm" data-d="${c.deadline}" data-done="${c.status === 3}"><b>--:--:--</b><span></span></div>
      ${c.esc || late ? '<div class="flag">⚑ Escalated to Student Affairs</div>' : ""}
      ${mg ? ctrl + `<a class="btn dark" href="#/chat/${c.id}">Go to messages</a>` : ""}
      ${c.rating ? `<h3>Student feedback</h3><div class="card"><b style="color:var(--amber)">${"★".repeat(c.rating.stars)}</b><p>${esc(c.rating.text)}</p></div>` : ""}</div></div>`;
  },
  ahome() {
    const l = complaints.filter(c => flt.host === "all" || c.hostel === flt.host), s = stat(l);
    const hrs = l.filter(c => c.done).map(c => (c.done - c.created) / H), rt = l.filter(c => c.rating).map(c => c.rating.stars);
    const late = l.filter(c => c.esc || isLate(c)), fx = l.filter(c => c.status === 3 && c.done), ontime = fx.length ? Math.round(fx.filter(c => c.done <= c.deadline).length / fx.length * 100) + "%" : "–", bx = (n, k, x) => `<div class="stat ${x || ""}"><b>${n}</b><span>${k}</span></div>`;
    const rows = hostels().map(h => { const q = complaints.filter(c => c.hostel === h), t = stat(q); return `<tr><td><b>${esc(h)}</b></td><td>${q.length}</td><td>${t.fixed}</td><td style="color:${t.overdue ? "var(--red)" : "inherit"}">${t.overdue}</td><td>${avg(q.filter(c => c.done).map(c => (c.done - c.created) / H))}h</td><td>${avg(q.filter(c => c.rating).map(c => c.rating.stars))}</td></tr>`; }).join("");
    return `<header class="top"><div class="grow"><h1>Hi there, Student Affairs Officer</h1><p>Hostel performance overview</p></div><a class="avatar" href="#/profile">SA</a></header>
      <div class="chips" id="hc">${["all", ...hostels()].map(h => `<button class="chip ${flt.host === h ? "on" : ""}" data-h="${esc(h)}">${h === "all" ? "All hostels" : esc(h)}${dot(h)}</button>`).join("")}</div>
      <div class="cols"><div>${weekly(s, "Weekly update")}<div class="stats s4">${bx(l.length, "Total complaints")}${bx(avg(hrs) + "h", "Avg completion time")}${bx(ontime, "On-time rate")}${bx(late.length, "Escalated", "red")}</div></div>
      <div><h3 class="first">Escalated complaints</h3>${late.length ? late.map(listItem).join("") : '<div class="empty">No escalations right now.</div>'}</div></div>
      <h3>Hostel performance</h3><div class="card tbl"><table><thead><tr><th>Hostel</th><th>Total</th><th>Fixed</th><th>Overdue</th><th>Avg time</th><th>Rating</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No complaints yet.</td></tr>'}</tbody></table></div>`;
  },
  sprofile() { return profileForm(); }
});
Object.assign(wire, {
  welcome() { setTimeout(() => { if (!location.hash || location.hash === "#/welcome") location.hash = "#/role"; }, 2400); },
  role() { $("#rf").onsubmit = e => { e.preventDefault(); location.hash = "#/login/" + new FormData(e.target).get("role"); }; },
  login(role) {
    $("#lf").onsubmit = async e => {
      e.preventDefault();
      const em = $("#le").value.trim().toLowerCase(), h = await sha(em + $("#lp").value), u = users.find(x => x.role === role && x.email === em && x.pw === h);
      if (!u) { const er = $("#er"); er.hidden = false; er.textContent = "Wrong email or password."; return; }
      user = u; save(); location.hash = HOME[role];
    };
  },
  forgot(role) {
    $("#ff").onsubmit = async e => {
      e.preventDefault();
      const em = $("#fe").value.trim().toLowerCase(), ph = $("#fp").value.trim(), pw = $("#fn").value, er = $("#er"), u = users.find(x => x.role === role && x.email === em && x.phone === ph);
      er.hidden = false;
      if (!u) return er.textContent = "No account matches that email and phone number.";
      if (pw.length < 6) return er.textContent = "Password must be at least 6 characters.";
      u.pw = await sha(em + pw); save(); toast("Password reset. Please log in."); location.hash = "#/login/" + role;
    };
  },
  techs() {
    document.querySelectorAll("[data-add]").forEach(b => b.onclick = () => openTechSheet(() => render()));
    document.querySelectorAll("[data-x]").forEach(b => b.onclick = () => {
      const t = techs.find(x => x.id === b.dataset.x);
      if (!t || !confirm(`Remove ${t.name} from your technicians?`)) return;
      techs = techs.filter(x => x.id !== t.id); save(); toast("Technician removed"); render();
    });
  },
  tasks: wireBoard, archive() { wireBoard(); $("#csv").onclick = exportCsv; },
  mdetail(id) {
    const c0 = find(id); if (user.role === "manager" && c0 && !c0.seen) { c0.seen = true; save(); }
    const f = document.querySelector(".fill");
    requestAnimationFrame(() => requestAnimationFrame(() => f && (f.style.width = f.dataset.w)));
    $("#addt")?.addEventListener("click", () => openTechSheet(t => { const s = $("#tc"), v = techLabel(t); s.add(new Option(v, v)); s.value = v; s.dispatchEvent(new Event("change")); }));
    const b = $("#up"); if (!b) return;
    b.onclick = () => {
      const c = find(id); let st = +$("#sc").value; const t = $("#tc").value || c.tech;
      if (st > 0 && !t) return toast("Assign a technician first");
      if (t && st === 0) st = 1;
      if (st !== c.status) (c.hist ||= [])[st] = Date.now();
      if (st !== c.status || (t || null) !== c.tech) c.msgs.push({ t: `Status: ${STATUS[st]}${t ? " · " + t : ""}`, from: "system", at: Date.now() });
      c.tech = t || null; c.status = st; c.done = st === 3 ? (c.done || Date.now()) : null;
      save(); toast("Complaint updated"); render();
    };
  },
  ahome() { $("#hc").onclick = e => { const b = e.target.closest("button"); if (b) { flt.host = b.dataset.h; render(); } }; },
  sprofile() { wire.profile(); }
});

/* ---------- router ---------- */
/* <main> gets the screen name as a class; these two collided with the .chat and .forgot component classes */
const PAGE = { chat: "chatpage", forgot: "forgotpage" };
function render() {
  sweep();
  const [, r = "welcome", id] = location.hash.split("/");
  const pub = ["welcome", "role", "login", "signup", "forgot"];
  if (!user && !pub.includes(r)) return (location.hash = "#/welcome");
  if (user && pub.includes(r)) return (location.hash = HOME[user.role]);
  if (["login", "signup", "forgot"].includes(r) && !HOME[id]) return (location.hash = "#/role");
  const allowed = { student: ["home", "new", "complaints", "c", "chat", "rate", "profile"], manager: ["mhome", "tasks", "techs", "m", "chat", "profile"], affairs: ["ahome", "archive", "m", "profile"] };
  if (user && !allowed[user.role].includes(r)) return (location.hash = HOME[user.role]);
  let name = r === "c" ? "detail" : r === "m" ? "mdetail" : r;
  if (name === "profile" && user.role !== "student") name = "sprofile";
  const fn = screens[name] || screens.welcome;
  $("#app").className = PAGE[name] || name;
  $("#app").innerHTML = name === "new" ? `<div class="panel narrow">${fn(id)}</div>` : fn(id);
  enhanceSelects();
  (wire[name] || (() => {}))(id);
  const nav = user ? NAV[user.role] : null;
  $("#nav").hidden = !nav;
  $("#tf").hidden = !!nav;
  if (nav) {
    const act = navKey(r), n = newCount();
    $("#nav").innerHTML = `<div class="brand">HostelLink</div>${nav.map(i => `<a href="#/${i[0]}" data-r="${i[0]}" class="${i[0] === act ? "on" : ""}${i[0] === "new" ? " nw" : ""}"${i[0] === act ? ' aria-current="page"' : ""}><span class="ic">${icon(i[0])}</span><span class="lb"><span class="lf">${i[1]}</span><span class="ls">${i[2] || i[1]}</span></span>${i[0] === "tasks" && n ? `<b class="bdg">${n}</b>` : ""}</a>`).join("")}${themeBtn}`;
  }
  window.scrollTo(0, 0);
  requestAnimationFrame(segMove); countUp(); appBadge();
  tick();
}
addEventListener("storage", e => {
  if (e.key === "hl_c3") {
    const old = new Set(complaints.map(c => c.id)); complaints = store.get("hl_c3", []);
    if (user?.role === "manager") { const n = scope().filter(c => !old.has(c.id)); if (n.length) { toast("New complaint · " + place(n[0])); navigator.vibrate?.([12, 40, 12]); } }
  } else if (e.key === "hl_t") techs = store.get("hl_t", []); else if (e.key === "hl_u2") { users = store.get("hl_u2", []); return; } else return;
  if (!user) return;
  const [, r, id] = location.hash.split("/");
  if (r === "chat") { const c = find(id), box = $("#ch"); if (c && box) { box.innerHTML = c.msgs.map(msgHTML).join(""); box.scrollTop = box.scrollHeight; } }
  else if (["home", "complaints", "mhome", "ahome", "c", "m", "techs"].includes(r) || (r === "tasks" && document.activeElement?.id !== "q")) render();
});
/* on-screen keyboard: hide the bottom bar while typing on a phone so it doesn't eat the screen */
let vvMax = 0;
const kbCheck = () => {
  const h = window.visualViewport ? visualViewport.height : innerHeight; vvMax = Math.max(vvMax, h);
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
  document.documentElement.classList.toggle("kb", typing && matchMedia("(max-width:899px)").matches && vvMax - h > 150);
};
window.visualViewport?.addEventListener("resize", kbCheck);
addEventListener("focusin", kbCheck); addEventListener("focusout", () => setTimeout(kbCheck, 60));
addEventListener("orientationchange", () => { vvMax = 0; setTimeout(kbCheck, 400); });
if (document.startViewTransition) document.documentElement.classList.add("vt");
addEventListener("hashchange", () => (document.startViewTransition && !matchMedia("(prefers-reduced-motion:reduce)").matches ? document.startViewTransition(render) : render()));
render();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
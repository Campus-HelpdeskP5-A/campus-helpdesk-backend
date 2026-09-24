// ============================================================================
// End-to-end test — exercises the complete §34 workflow against the REAL
// backend through the REAL frontend proxy (http://localhost:5000/api).
// Run:  node e2e_test.js
// ============================================================================
const BASE = "http://localhost:5000/api";
const PWD = "Password123!";
const stamp = Date.now();

let pass = 0;
const failures = [];

function ok(cond, label, extra = "") {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(`${label} ${extra}`);
    console.log(`  FAIL  ${label} ${extra}`);
  }
}

async function req(method, path, { token, body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { status: 0, data: null, err: e.message };
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  return { status: res.status, data };
}

async function login(email, password = PWD) {
  const r = await req("POST", "/auth/login", { body: { email, password } });
  return { status: r.status, token: r.data?.data?.token, user: r.data?.data?.user };
}

function finish() {
  console.log(`\n==== SUMMARY: ${pass} passed, ${failures.length} failed ====`);
  if (failures.length) failures.forEach((f) => console.log("  FAILED:", f));
  process.exit(failures.length ? 1 : 0);
}

const SEED = {
  manager: "manager@university.edu",
  auditor: "auditor@university.edu",
  reporter: `e2e.reporter.${stamp}@university.edu`,
  technician: "tech.network@university.edu",
};

(async () => {
  console.log("== 1-4. AUTH: register / login / JWT / auth/me ==");
  const reg = await req("POST", "/auth/register", {
    body: { email: SEED.reporter, password: PWD, full_name: "E2E Reporter" },
  });
  ok(reg.status === 201, "register -> 201", `got ${reg.status} ${JSON.stringify(reg.data)}`);
  const regUser = reg.data?.data?.user;
  ok(regUser?.role === "REPORTER", "registration role is REPORTER", `got ${regUser?.role}`);
  ok(regUser?.is_active === true, "new reporter is_active=true", `got ${regUser?.is_active}`);
  ok(regUser?.account_status === "ACTIVE", "new reporter account_status ACTIVE", `got ${regUser?.account_status}`);
  ok(typeof reg.data?.data?.token === "string", "register returns JWT");

  const rep = await login(SEED.reporter);
  ok(rep.status === 200 && rep.token, "reporter login -> 200 + token", `got ${rep.status}`);

  const badLogin = await login(SEED.reporter, "WrongPassword1!");
  ok(badLogin.status === 401, "wrong password -> 401", `got ${badLogin.status}`);

  const me = await req("GET", "/auth/me", { token: rep.token });
  ok(me.status === 200 && me.data?.data?.user?.email === SEED.reporter,
    "GET /auth/me identifies the user", `got ${me.status}`);
  ok(me.data?.data?.user?.is_active === true, "/auth/me returns is_active");

  const meNo = await req("GET", "/auth/me");
  ok(meNo.status === 401, "/auth/me without token -> 401", `got ${meNo.status}`);
  const meBad = await req("GET", "/auth/me", { token: "not.a.jwt" });
  ok(meBad.status === 401, "/auth/me with garbage token -> 401", `got ${meBad.status}`);

  const mgr = await login(SEED.manager);
  ok(mgr.status === 200 && mgr.user?.role === "MANAGER", "manager login -> MANAGER", `got ${mgr.status} ${mgr.user?.role}`);

  const aud = await login(SEED.auditor);
  ok(aud.status === 200 && aud.user?.role === "AUDITOR", "auditor login -> AUDITOR", `got ${aud.status} ${aud.user?.role}`);

  const tech = await login(SEED.technician);
  ok(tech.status === 200 && tech.user?.role === "TECHNICIAN", "technician login -> TECHNICIAN", `got ${tech.status} ${tech.user?.role}`);

  const suspended = await login("suspended@university.edu");
  ok(suspended.status === 403, "suspended account login -> 403", `got ${suspended.status}`);

  globalThis.__E2E = { rep, mgr, aud, tech, SEED };
  console.log(`-- auth chunk done: ${pass} passed, ${failures.length} failed --`);
  console.log("== 5-9. CATEGORIES / LOCATIONS / TICKET CREATION ==");
  const cats = await req("GET", "/categories", { token: rep.token });
  ok(cats.status === 200 && (cats.data?.data || []).length > 0,
    "GET /categories returns real rows", `got ${cats.status} n=${cats.data?.data?.length}`);
  const locs = await req("GET", "/locations", { token: rep.token });
  ok(locs.status === 200 && (locs.data?.data || []).length > 0,
    "GET /locations returns real rows", `got ${locs.status}`);
  const category = cats.data.data.find((c) => c.is_active !== false) || cats.data.data[0];
  const location = locs.data.data[0];

  const t1r = await req("POST", "/tickets", {
    token: rep.token,
    body: {
      category_id: category.category_id,
      location_id: location.location_id,
      title: "E2E WiFi is not working",
      description: "Internet connection is unavailable in the lab.",
      impact: "HIGH",
      urgency: "HIGH",
    },
  });
  ok(t1r.status === 201, "POST /tickets -> 201", `got ${t1r.status} ${JSON.stringify(t1r.data)}`);
  const t1 = t1r.data?.data?.ticket;
  ok(t1?.status === "OPEN", "new ticket status OPEN", `got ${t1?.status}`);
  ok(t1?.priority === "CRITICAL", "HIGH+HIGH -> CRITICAL (matrix)", `got ${t1?.priority}`);
  ok(/^HLP-\d{6}$/.test(t1?.reference_number || ""), "reference_number generated", `got ${t1?.reference_number}`);
  ok(!!t1?.response_due_at && !!t1?.resolution_due_at, "SLA due dates computed",
    `resp=${t1?.response_due_at}`);
  ok((t1r.data?.data?.sla?.response_target_minutes || 0) > 0, "response embeds SLA profile");
  ok(!!t1?.reporter_id && t1.reporter_id === me.data?.data?.user?.user_id,
    "reporter_id from JWT, not payload", `got ${t1?.reporter_id}`);

  const t2r = await req("POST", "/tickets", {
    token: rep.token,
    body: {
      category_id: category.category_id,
      location_id: location.location_id,
      title: "E2E projector dim image",
      description: "Projector image is dim in room 204.",
      impact: "LOW",
      urgency: "LOW",
    },
  });
  ok(t2r.status === 201 && t2r.data?.data?.ticket?.priority === "LOW",
    "LOW+LOW -> LOW", `got ${t2r.status} ${t2r.data?.data?.ticket?.priority}`);
  const t2 = t2r.data?.data?.ticket;

  const missing = await req("POST", "/tickets", {
    token: rep.token,
    body: { category_id: category.category_id, location_id: location.location_id, title: "x" },
  });
  ok(missing.status === 400, "missing required fields -> 400", `got ${missing.status}`);

  const list = await req("GET", "/tickets?status=OPEN", { token: rep.token });
  ok(list.status === 200 && (list.data?.data || []).some((t) => t.ticket_id === t1.ticket_id),
    "new ticket appears in OPEN filter", `got ${list.status}`);
  ok((list.data?.data || []).every((t) => t.status === "OPEN"), "status filter is real");
  const badFilter = await req("GET", "/tickets?status=BOGUS", { token: rep.token });
  ok(badFilter.status === 400 && Array.isArray(badFilter.data?.allowed_values),
    "invalid status filter -> 400 + allowed_values", `got ${badFilter.status}`);
  const t1get = await req("GET", `/tickets/${t1.ticket_id}`, { token: rep.token });
  ok(t1get.status === 200 && !!t1get.data?.data?.response_due_at,
    "GET /tickets/:id returns due dates", `got ${t1get.status}`);

  console.log("== REPORTER GUARDS ==");
  ok((await req("GET", "/users", { token: rep.token })).status === 403, "reporter GET /users -> 403");
  ok((await req("GET", "/dashboard", { token: rep.token })).status === 403, "reporter GET /dashboard -> 403");
  ok((await req("GET", "/dashboard/team", { token: rep.token })).status === 403, "reporter GET /dashboard/team -> 403");
  ok((await req("GET", "/audit-logs", { token: rep.token })).status === 403, "reporter GET /audit-logs -> 403");
  ok((await req("PATCH", `/tickets/${t1.ticket_id}/status`, { token: rep.token, body: { status: "IN_PROGRESS" } })).status === 403,
    "reporter PATCH status -> 403");
  const earlyFb = await req("POST", "/feedback", { token: rep.token, body: { ticket_id: t1.ticket_id, rating: 5 } });
  ok(earlyFb.status === 400, "feedback before resolve -> 400", `got ${earlyFb.status}`);

  globalThis.__E2E = { ...globalThis.__E2E, t1, t2, category, location };
  console.log(`-- chunk2a done: ${pass} passed, ${failures.length} failed --`);
  console.log("== MANAGER: USERS / DASHBOARD / SLA CONFIG ==");
  const usersRes = await req("GET", "/users", { token: mgr.token });
  ok(usersRes.status === 200 && (usersRes.data?.data || []).length >= 10,
    "GET /users lists real users", `got ${usersRes.status} n=${usersRes.data?.data?.length}`);
  const users = usersRes.data?.data || [];
  ok(users.every((u) => typeof u.is_active === "boolean"), "every user row exposes boolean is_active");
  const techUser = users.find((u) => u.role === "TECHNICIAN" && u.email === SEED.technician);
  ok(!!techUser, "target technician found", JSON.stringify(techUser && { e: techUser.email, a: techUser.is_active }));

  const dash = await req("GET", "/dashboard", { token: mgr.token });
  ok(dash.status === 200, "GET /dashboard -> 200",
    `got ${dash.status} ${JSON.stringify(dash.data).slice(0, 160)}`);
  const dd = dash.data?.data || {};
  const sum = (dd.tickets?.open || 0) + (dd.tickets?.in_progress || 0) + (dd.tickets?.pending || 0) +
    (dd.tickets?.resolved || 0) + (dd.tickets?.closed || 0);
  ok(dd.tickets?.total === sum, "dashboard total == sum of five statuses",
    `total=${dd.tickets?.total} sum=${sum}`);
  ok((dd.tickets?.total || 0) >= 36, "dashboard counts real tickets (>= seed)", `got ${dd.tickets?.total}`);
  ok(typeof dd.sla?.response_sla_breached === "number" && typeof dd.sla?.within_sla === "number",
    "dashboard SLA counters are numbers");
  ok(Array.isArray(dd.tickets_by_status) && Array.isArray(dd.tickets_by_priority) &&
    Array.isArray(dd.tickets_by_category), "dashboard chart arrays present");
  ok(!!dd.feedback && !!dd.assignments && !!dd.escalations,
    "dashboard feedback/assignments/escalations present");
  ok(typeof dd.feedback?.average_rating !== "undefined", "dashboard real feedback average present",
    `avg=${dd.feedback?.average_rating}`);

  const teamDash = await req("GET", "/dashboard/team", { token: mgr.token });
  ok(teamDash.status === 200 && (teamDash.data?.data?.teams || []).length >= 1,
    "GET /dashboard/team returns manager's teams",
    `got ${teamDash.status} n=${teamDash.data?.data?.teams?.length}`);
  ok(Array.isArray(teamDash.data?.data?.workload), "team dashboard workload array present");

  const bh = await req("GET", "/sla/business-hours", { token: mgr.token });
  ok(bh.status === 200 && (bh.data?.data?.[0]?.days || []).length === 7,
    "GET /sla/business-hours has 7 day definitions", `got ${bh.status}`);
  const prof = await req("GET", "/sla/profiles", { token: mgr.token });
  ok(prof.status === 200 && (prof.data?.data || []).length >= 3 &&
    typeof prof.data.data[0].response_target_minutes === "number",
    "GET /sla/profiles returns configured targets", `got ${prof.status}`);
  const matrix = await req("GET", "/sla/priority-matrix", { token: mgr.token });
  ok(matrix.status === 200 && (matrix.data?.data || []).length === 9,
    "GET /sla/priority-matrix has 9 entries", `got ${matrix.status} n=${matrix.data?.data?.length}`);
  const hhRow = (matrix.data?.data || []).find((m) => m.impact === "HIGH" && m.urgency === "HIGH");
  ok(hhRow?.priority === "CRITICAL", "matrix HIGH+HIGH row is CRITICAL", `got ${hhRow?.priority}`);
  ok(!!hhRow?.priority_matrix_id && !!hhRow?.sla_profile_name,
    "matrix rows expose id + profile name");
  const resolveHH = await req("GET", "/sla/priority-matrix/resolve?impact=HIGH&urgency=HIGH", { token: mgr.token });
  ok(resolveHH.status === 200 && resolveHH.data?.data?.priority === "CRITICAL",
    "resolve HIGH/HIGH -> CRITICAL", `got ${resolveHH.status} ${resolveHH.data?.data?.priority}`);
  const resolveLL = await req("GET", "/sla/priority-matrix/resolve?impact=LOW&urgency=LOW", { token: rep.token });
  ok(resolveLL.status === 200 && resolveLL.data?.data?.priority === "LOW",
    "resolve LOW/LOW -> LOW", `got ${resolveLL.status} ${resolveLL.data?.data?.priority}`);
  ok((await req("GET", "/sla/priority-matrix/resolve?impact=BOGUS&urgency=HIGH", { token: mgr.token })).status === 400,
    "resolve invalid impact -> 400");
  ok((await req("POST", "/sla/profiles", {
    token: rep.token,
    body: { name: "X", response_target_minutes: 1, resolution_target_minutes: 2, business_hours_id: bh.data.data[0].business_hours_id },
  })).status === 403, "reporter POST /sla/profiles -> 403");

  globalThis.__E2E = { ...globalThis.__E2E, users, techUser };
  console.log(`-- chunk2b done: ${pass} passed, ${failures.length} failed --`);
  console.log("== 10-16. ASSIGNMENT / NOTIFICATION / HISTORY / EVENTS ==");
  const teamsRes = await req("GET", "/support-teams", { token: mgr.token });
  const itTeam = (teamsRes.data?.data || []).find((t) => t.team_name === "IT Support");
  ok(!!itTeam, "GET /support-teams includes IT Support");

  const asg = await req("POST", "/assignments", {
    token: mgr.token,
    body: {
      ticket_id: globalThis.__E2E.t1.ticket_id,
      assigned_to: techUser.user_id,
      assigned_team_id: itTeam.support_team_id,
      reason: "E2E assignment",
    },
  });
  ok(asg.status === 201, "POST /assignments -> 201",
    `got ${asg.status} ${JSON.stringify(asg.data)}`);
  ok(asg.data?.data?.status_changed === true && asg.data?.data?.new_status === "IN_PROGRESS",
    "assignment moves OPEN ticket to IN_PROGRESS",
    `got ${JSON.stringify(asg.data?.data && { sc: asg.data.data.status_changed, ns: asg.data.data.new_status })}`);
  const asgRow = asg.data?.data?.assignment;
  ok(!!asgRow?.assigned_at, "assignment stores assigned_at", `got ${asgRow?.assigned_at}`);

  const t1id = globalThis.__E2E.t1.ticket_id;
  const t1ref = globalThis.__E2E.t1.reference_number;
  const t1after = await req("GET", `/tickets/${t1id}`, { token: mgr.token });
  ok(t1after.data?.data?.status === "IN_PROGRESS" && !!t1after.data?.data?.first_response_at,
    "ticket now IN_PROGRESS with first_response_at",
    `got ${t1after.data?.data?.status} fr=${t1after.data?.data?.first_response_at}`);

  ok((await req("POST", "/assignments", { token: mgr.token, body: { ticket_id: t1id } })).status === 400,
    "assignment without target -> 400");
  ok((await req("POST", "/assignments", {
    token: rep.token,
    body: { ticket_id: t1id, assigned_to: techUser.user_id },
  })).status === 403, "reporter POST /assignments -> 403");

  const techTickets = await req("GET", "/tickets?status=IN_PROGRESS", { token: tech.token });
  ok(techTickets.status === 200 && (techTickets.data?.data || []).some((t) => t.ticket_id === t1id),
    "technician sees assigned ticket", `got ${techTickets.status}`);

  const techNotif = await req("GET", "/notifications?unread=true", { token: tech.token });
  ok(techNotif.status === 200, "technician GET /notifications -> 200", `got ${techNotif.status}`);
  const assignedNotif = (techNotif.data?.data || []).find(
    (n) => n.notification_type === "TICKET_ASSIGNED" && (n.body || "").includes(t1ref));
  ok(!!assignedNotif, "assignment produced real notification (body + reference)",
    `types=${JSON.stringify((techNotif.data?.data || []).slice(0, 4).map((n) => n.notification_type))}`);

  const hist = await req("GET", `/status-history/ticket/${t1id}`, { token: rep.token });
  ok(hist.status === 200 && (hist.data?.data || []).length >= 2,
    "status history has creation + transition rows",
    `got ${hist.status} n=${hist.data?.data?.length}`);
  ok((hist.data?.data || []).every((h) => h.changed_at && h.changed_by_name),
    "history rows expose changed_at + changed_by_name");
  ok((hist.data?.data || []).every((h) => h.old_status !== h.new_status || h.old_status === null),
    "history never records old == new");

  const events = await req("GET", `/ticket-events/ticket/${t1id}`, { token: rep.token });
  ok(events.status === 200, "GET /ticket-events -> 200", `got ${events.status}`);
  const evTypes = (events.data?.data || []).map((e) => e.event_type);
  ok(evTypes.includes("TICKET_CREATED"), "backend recorded TICKET_CREATED");
  ok(evTypes.includes("ASSIGNED"), "backend recorded ASSIGNED");
  ok(evTypes.includes("STATUS_CHANGED"), "backend recorded STATUS_CHANGED");
  ok((events.data?.data || []).every((e) => e.ticket_event_id && e.actor_user_id && e.actor_name),
    "events expose ticket_event_id + actor_user_id + actor_name");

  globalThis.__E2E = { ...globalThis.__E2E, users, techUser, itTeam, asgRow, histRows: hist.data.data };
  console.log(`-- chunk3 done: ${pass} passed, ${failures.length} failed --`);
  console.log("== 12. COMMENTS (public / internal / visibility rules) ==");
  const pub = await req("POST", "/comments", {
    token: rep.token,
    body: { ticket_id: t1id, body: "Adding more information from the reporter.", is_internal: false },
  });
  ok(pub.status === 201, "reporter public comment -> 201", `got ${pub.status} ${JSON.stringify(pub.data)}`);
  ok(pub.data?.data?.is_internal === false && typeof pub.data?.data?.body === "string",
    "comment response exposes body + is_internal",
    JSON.stringify(pub.data?.data && { b: pub.data.data.body, i: pub.data.data.is_internal }));

  const internalTry = await req("POST", "/comments", {
    token: rep.token,
    body: { ticket_id: t1id, body: "Reporter must not mark internal.", is_internal: true },
  });
  ok(internalTry.status === 403, "reporter internal comment -> 403", `got ${internalTry.status}`);

  const staffInt = await req("POST", "/comments", {
    token: tech.token,
    body: { ticket_id: t1id, body: "Internal: replaced the AP channel.", is_internal: true },
  });
  ok(staffInt.status === 201 && staffInt.data?.data?.is_internal === true,
    "technician internal comment -> 201", `got ${staffInt.status}`);

  const repView = await req("GET", `/comments/ticket/${t1id}`, { token: rep.token });
  ok(repView.status === 200 && (repView.data?.data || []).some((c) => c.body === pub.data.data.body),
    "reporter sees own public comment", `got ${repView.status}`);
  ok((repView.data?.data || []).every((c) => !c.is_internal),
    "reporter never sees internal comments",
    JSON.stringify((repView.data?.data || []).map((c) => c.is_internal)));
  ok((repView.data?.data || []).every((c) => c.user_name),
    "comment rows expose user_name");

  const techView = await req("GET", `/comments/ticket/${t1id}`, { token: tech.token });
  ok(techView.status === 200 && (techView.data?.data || []).some((c) => c.is_internal),
    "technician sees internal comments", `got ${techView.status}`);

  const emptyBody = await req("POST", "/comments", {
    token: rep.token, body: { ticket_id: t1id, body: "   " },
  });
  ok(emptyBody.status === 400, "empty comment -> 400", `got ${emptyBody.status}`);

  console.log("== 13-14. STATUS LIFECYCLE (PENDING / RESOLVED / CLOSED) ==");
  const setStatus = async (token, status, label) => {
    const r = await req("PATCH", `/tickets/${t1id}/status`, { token, body: { status } });
    ok(r.status === 200, `${label} -> 200`, `got ${r.status} ${JSON.stringify(r.data)}`);
    return r;
  };
  await setStatus(tech.token, "PENDING", "status -> PENDING");
  ok((await req("GET", `/tickets/${t1id}`, { token: mgr.token })).data?.data?.status === "PENDING",
    "ticket reads back PENDING");
  await setStatus(tech.token, "IN_PROGRESS", "status -> IN_PROGRESS");
  await setStatus(tech.token, "RESOLVED", "status -> RESOLVED");
  const resolvedT = (await req("GET", `/tickets/${t1id}`, { token: mgr.token })).data?.data;
  ok(resolvedT?.status === "RESOLVED" && !!resolvedT?.resolved_at,
    "RESOLVED stamps resolved_at", `st=${resolvedT?.status} at=${resolvedT?.resolved_at}`);
  await setStatus(tech.token, "CLOSED", "status -> CLOSED");
  const closedT = (await req("GET", `/tickets/${t1id}`, { token: mgr.token })).data?.data;
  ok(closedT?.status === "CLOSED" && !!closedT?.closed_at,
    "CLOSED stamps closed_at", `st=${closedT?.status} at=${closedT?.closed_at}`);

  const dupStatus = await req("PATCH", `/tickets/${t1id}/status`, { token: tech.token, body: { status: "CLOSED" } });
  ok(dupStatus.status === 400, "duplicate status -> 400", `got ${dupStatus.status}`);
  const badStatus = await req("PATCH", `/tickets/${t1id}/status`, { token: tech.token, body: { status: "BOGUS" } });
  ok(badStatus.status === 400 && Array.isArray(badStatus.data?.allowed_values),
    "invalid status -> 400 + allowed_values", `got ${badStatus.status}`);
  ok((await req("PATCH", `/tickets/${t1id}/status`, { token: aud.token, body: { status: "OPEN" } })).status === 403,
    "auditor PATCH status -> 403");

  const histAfter = await req("GET", `/status-history/ticket/${t1id}`, { token: mgr.token });
  const newStatuses = (histAfter.data?.data || []).map((h) => h.new_status);
  ok(newStatuses.includes("PENDING") && newStatuses.includes("RESOLVED") && newStatuses.includes("CLOSED"),
    "history recorded PENDING/RESOLVED/CLOSED transitions",
    JSON.stringify(newStatuses));
  ok((histAfter.data?.data || []).length >= 6,
    "history rows accumulated across the lifecycle", `n=${histAfter.data?.data?.length}`);

  const evAfter = await req("GET", `/ticket-events/ticket/${t1id}`, { token: mgr.token });
  ok((evAfter.data?.data || []).filter((e) => e.event_type === "STATUS_CHANGED").length >= 5,
    "STATUS_CHANGED event per transition",
    `n=${(evAfter.data?.data || []).filter((e) => e.event_type === "STATUS_CHANGED").length}`);

  console.log(`-- chunk4 done: ${pass} passed, ${failures.length} failed --`);
  console.log("== 17. FEEDBACK (reporter only, one per ticket, 1-5) ==");
  const fbBad = await req("POST", "/feedback", { token: rep.token, body: { ticket_id: t1id, rating: 6 } });
  ok(fbBad.status === 400, "rating 6 -> 400", `got ${fbBad.status}`);
  const fb = await req("POST", "/feedback", {
    token: rep.token, body: { ticket_id: t1id, rating: 5, comment: "Great support!" },
  });
  ok(fb.status === 201, "reporter feedback on CLOSED ticket -> 201",
    `got ${fb.status} ${JSON.stringify(fb.data)}`);
  ok(fb.data?.data?.rating === 5, "feedback stores rating", `got ${fb.data?.data?.rating}`);
  const fbDup = await req("POST", "/feedback", { token: rep.token, body: { ticket_id: t1id, rating: 4 } });
  ok(fbDup.status === 409, "duplicate feedback -> 409", `got ${fbDup.status}`);
  const fbOther = await req("POST", "/feedback", { token: mgr.token, body: { ticket_id: t1id, rating: 5 } });
  ok(fbOther.status === 403, "non-reporter feedback -> 403", `got ${fbOther.status}`);
  const fbList = await req("GET", `/feedback/ticket/${t1id}`, { token: rep.token });
  ok(fbList.status === 200 && (fbList.data?.data || []).length === 1 &&
    !!fbList.data.data[0].user_name, "GET /feedback returns the row with user_name",
    `got ${fbList.status} n=${fbList.data?.data?.length}`);

  const dashAfterFb = await req("GET", "/dashboard", { token: mgr.token });
  ok((dashAfterFb.data?.data?.feedback?.total_feedback || 0) >= 5,
    "dashboard feedback count includes new submission",
    `total=${dashAfterFb.data?.data?.feedback?.total_feedback}`);

  console.log("== 18. ESCALATIONS (create / events / resolve) ==");
  const t2id = globalThis.__E2E.t2.ticket_id;
  const esc = await req("POST", "/escalations", {
    token: mgr.token,
    body: {
      ticket_id: t2id,
      trigger_type: "MANUAL",
      severity: "HIGH",
      assigned_to: techUser.user_id,
      assigned_team_id: itTeam.support_team_id,
      reason: "E2E escalation for verification",
    },
  });
  ok(esc.status === 201, "POST /escalations -> 201",
    `got ${esc.status} ${JSON.stringify(esc.data)}`);
  const escRow = esc.data?.data;
  ok(escRow?.severity === "HIGH", "escalation stores severity", `got ${escRow?.severity}`);
  ok(!!escRow?.triggered_at, "escalation exposes triggered_at", `got ${escRow?.triggered_at}`);
  ok(escRow?.status === "OPEN", "new escalation status OPEN", `got ${escRow?.status}`);
  ok(escRow?.from_user_id === mgr.user.user_id, "escalation records who triggered it",
    `got ${escRow?.from_user_id}`);

  const escNoTarget = await req("POST", "/escalations", {
    token: mgr.token, body: { ticket_id: t2id, trigger_type: "MANUAL", severity: "HIGH" },
  });
  ok(escNoTarget.status === 400, "escalation without target -> 400", `got ${escNoTarget.status}`);
  ok((await req("POST", "/escalations", {
    token: rep.token,
    body: { ticket_id: t2id, trigger_type: "MANUAL", severity: "HIGH", assigned_to: techUser.user_id },
  })).status === 403, "reporter POST /escalations -> 403");

  const escList = await req("GET", `/escalations/ticket/${t2id}`, { token: rep.token });
  ok(escList.status === 200 && (escList.data?.data || []).some((e) => e.escalation_id === escRow.escalation_id),
    "reporter sees escalation on own ticket", `got ${escList.status}`);

  const escEvents = await req("GET", `/ticket-events/ticket/${t2id}`, { token: mgr.token });
  ok((escEvents.data?.data || []).some((e) => e.event_type === "ESCALATED"),
    "backend recorded ESCALATED event");

  const escNotif = await req("GET", "/notifications?unread=true", { token: tech.token });
  ok((escNotif.data?.data || []).some((n) => n.notification_type === "TICKET_ESCALATED"),
    "escalation notified the assignee");

  const escResolve = await req("PATCH", `/escalations/${escRow.escalation_id}/resolve`, { token: mgr.token });
  ok(escResolve.status === 200 && !!escResolve.data?.data?.resolved_at &&
    escResolve.data?.data?.status === "RESOLVED",
    "PATCH resolve -> resolved_at + status RESOLVED",
    `got ${escResolve.status} ${JSON.stringify(escResolve.data?.data && { r: escResolve.data.data.resolved_at, s: escResolve.data.data.status })}`);
  const escAgain = await req("PATCH", `/escalations/${escRow.escalation_id}/resolve`, { token: mgr.token });
  ok(escAgain.status === 400, "resolving twice -> 400", `got ${escAgain.status}`);
  ok((await req("PATCH", `/escalations/${escRow.escalation_id}/resolve`, { token: rep.token })).status === 403,
    "reporter resolve -> 403");

  const escEvents2 = await req("GET", `/ticket-events/ticket/${t2id}`, { token: mgr.token });
  ok((escEvents2.data?.data || []).some((e) => e.event_type === "ESCALATION_RESOLVED"),
    "backend recorded ESCALATION_RESOLVED event");

  console.log(`-- chunk5 done: ${pass} passed, ${failures.length} failed --`);
  console.log("== 18b. WORK LOGS (CRUD, real technician data) ==");
  const started = new Date(Date.now() - 90 * 60000).toISOString();
  const ended = new Date(Date.now() - 1000).toISOString();
  const wl = await req("POST", "/work-logs", {
    token: tech.token,
    body: {
      ticket_id: t1id,
      time_spent_minutes: 90,
      started_at: started,
      ended_at: ended,
      note: "Diagnosed and fixed the network issue.",
    },
  });
  ok(wl.status === 201, "POST /work-logs -> 201", `got ${wl.status} ${JSON.stringify(wl.data)}`);
  const wlId = wl.data?.data?.work_log_id;
  ok(!!wlId && wl.data?.data?.user_id === techUser.user_id && wl.data?.data?.time_spent_minutes === 90,
    "work log stores user/time/note",
    JSON.stringify(wl.data?.data && { u: wl.data.data.user_id, m: wl.data.data.time_spent_minutes }));
  const wlList = await req("GET", `/work-logs/ticket/${t1id}`, { token: tech.token });
  ok(wlList.status === 200 && (wlList.data?.data || []).some((w) => w.work_log_id === wlId && w.user_name),
    "GET /work-logs returns row with user_name", `got ${wlList.status}`);
  const wlUpd = await req("PUT", `/work-logs/${wlId}`, {
    token: tech.token, body: { time_spent_minutes: 120, note: "Updated note." },
  });
  ok(wlUpd.status === 200 && wlUpd.data?.data?.time_spent_minutes === 120,
    "PUT /work-logs/:id updates", `got ${wlUpd.status} m=${wlUpd.data?.data?.time_spent_minutes}`);
  ok((await req("PUT", `/work-logs/${wlId}`, { token: rep.token, body: { time_spent_minutes: 5 } })).status === 403,
    "reporter PUT work-log -> 403");
  ok((await req("DELETE", `/work-logs/${wlId}`, { token: tech.token })).status === 200,
    "DELETE /work-logs/:id -> 200");
  ok((await req("GET", `/work-logs/${wlId}`, { token: tech.token })).status === 404,
    "deleted work log -> 404");

  console.log("== 15b. ATTACHMENTS (metadata contract, no fake uploads) ==");
  const fileUuid = `11111111-2222-4333-8444-${String(Date.now()).padStart(12, "0").slice(-12)}`;
  const att = await req("POST", "/attachments", {
    token: tech.token,
    body: {
      ticket_id: t1id,
      file_uuid: fileUuid,
      file_name: "screenshot.png",
      mime_type: "image/png",
      file_size: 245678,
      storage_path: `tickets/e2e/screenshot-${Date.now()}.png`,
    },
  });
  ok(att.status === 201, "POST /attachments -> 201", `got ${att.status} ${JSON.stringify(att.data)}`);
  ok(att.data?.data?.file_name === "screenshot.png" && att.data?.data?.mime_type === "image/png" &&
    !!att.data?.data?.created_at, "attachment exposes file_name/mime_type/created_at",
    JSON.stringify(att.data?.data && { f: att.data.data.file_name, m: att.data.data.mime_type }));
  const attDup = await req("POST", "/attachments", {
    token: tech.token,
    body: { ticket_id: t1id, file_uuid: fileUuid, file_name: "again.png", file_size: 1, storage_path: "x" },
  });
  ok(attDup.status === 409, "duplicate file_uuid -> 409", `got ${attDup.status}`);
  const attMissing = await req("POST", "/attachments", {
    token: tech.token,
    body: { ticket_id: t1id, file_uuid: `22222222-2222-4333-8444-${String(Date.now()).padStart(12, "0").slice(-12)}`, file_name: "n.png", file_size: 1 },
  });
  ok(attMissing.status === 400, "attachment without storage_path -> 400", `got ${attMissing.status}`);
  const attList = await req("GET", `/attachments/ticket/${t1id}`, { token: rep.token });
  ok(attList.status === 200 && (attList.data?.data || []).some((a) => a.attachment_id === att.data.data.attachment_id),
    "GET /attachments returns the row", `got ${attList.status}`);
  ok((await req("DELETE", `/attachments/${att.data.data.attachment_id}`, { token: tech.token })).status === 200,
    "DELETE /attachments/:id -> 200");
  const evFinal = await req("GET", `/ticket-events/ticket/${t1id}`, { token: mgr.token });
  const finalTypes = (evFinal.data?.data || []).map((e) => e.event_type);
  ok(finalTypes.includes("ATTACHMENT_ADDED") && finalTypes.includes("ATTACHMENT_DELETED"),
    "backend recorded ATTACHMENT_ADDED + ATTACHMENT_DELETED", JSON.stringify(finalTypes));

  console.log("== PREDICTIONS (read-only, real AI rows) ==");
  const preds = await req("GET", `/predictions/ticket/${t1id}`, { token: tech.token });
  ok(preds.status === 200 && Array.isArray(preds.data?.data),
    "GET /predictions/ticket/:id -> 200 array", `got ${preds.status}`);

  console.log("== 21. AUDIT LOGS (actor from JWT, filters, total) ==");
  const auditCreate = await req("POST", "/audit-logs", {
    token: mgr.token,
    body: {
      entity_type: "TICKET",
      entity_id: t1id,
      action: "E2E_REVIEW",
      actor_user_id: "spoofed-should-be-ignored",
      old_values: { status: "IN_PROGRESS" },
      new_values: { status: "CLOSED" },
    },
  });
  ok(auditCreate.status === 201, "POST /audit-logs -> 201",
    `got ${auditCreate.status} ${JSON.stringify(auditCreate.data)}`);
  ok(auditCreate.data?.data?.actor_user_id === mgr.user.user_id,
    "audit actor comes from JWT (spoofed actor ignored)",
    `got ${auditCreate.data?.data?.actor_user_id}`);
  ok(!!auditCreate.data?.data?.old_values && !!auditCreate.data?.data?.new_values,
    "audit stores old_values/new_values");
  const auditList = await req("GET", "/audit-logs?action=E2E_REVIEW&limit=5", { token: aud.token });
  ok(auditList.status === 200 && (auditList.data?.data || []).length >= 1,
    "auditor GET /audit-logs with filter -> rows", `got ${auditList.status}`);
  ok(typeof auditList.data?.pagination?.total === "number" && auditList.data.pagination.total >= 1,
    "pagination exposes total", `got ${JSON.stringify(auditList.data?.pagination)}`);
  ok((await req("POST", "/audit-logs", {
    token: aud.token, body: { entity_type: "TICKET", entity_id: t1id, action: "X" },
  })).status === 403, "auditor POST /audit-logs -> 403");

  console.log(`-- chunk6a done: ${pass} passed, ${failures.length} failed --`);
  console.log("== USER ADMIN (create / toggle status / role change) ==");
  const scratchEmail = `e2e.admin.${stamp}@university.edu`;
  const created = await req("POST", "/users", {
    token: mgr.token,
    body: { email: scratchEmail, password: PWD, full_name: "Scratch User", role: "TECHNICIAN" },
  });
  ok(created.status === 201 && created.data?.data?.is_active === true,
    "POST /users creates active user",
    `got ${created.status} is_active=${created.data?.data?.is_active}`);
  const scratchId = created.data?.data?.user_id;
  const deact = await req("PATCH", `/users/${scratchId}/status`, { token: mgr.token, body: { is_active: false } });
  ok(deact.status === 200 && deact.data?.data?.is_active === false &&
    deact.data?.data?.account_status === "SUSPENDED",
    "toggle is_active=false -> SUSPENDED",
    `got ${deact.status} ${deact.data?.data?.is_active} ${deact.data?.data?.account_status}`);
  const scratchLogin = await login(scratchEmail);
  ok(scratchLogin.status === 403, "deactivated user cannot log in -> 403", `got ${scratchLogin.status}`);
  const react = await req("PATCH", `/users/${scratchId}/status`, { token: mgr.token, body: { is_active: true } });
  ok(react.status === 200 && react.data?.data?.is_active === true &&
    react.data?.data?.account_status === "ACTIVE",
    "toggle is_active=true -> ACTIVE",
    `got ${react.status} ${react.data?.data?.account_status}`);
  ok((await login(scratchEmail)).status === 200, "reactivated user can log in");
  const roleChg = await req("PUT", `/users/${scratchId}`, { token: mgr.token, body: { role: "REPORTER" } });
  ok(roleChg.status === 200 && roleChg.data?.data?.role === "REPORTER",
    "PUT /users changes role", `got ${roleChg.status} ${roleChg.data?.data?.role}`);
  ok((await req("POST", "/users", {
    token: rep.token, body: { email: `e2e.x.${stamp}@u.edu`, password: PWD, full_name: "X", role: "AGENT" },
  })).status === 403, "reporter POST /users -> 403");

  console.log("== ASSIGNMENT REASSIGN / UNASSIGN ==");
  const reass = await req("PATCH", `/assignments/${asgRow.assignment_id}`, {
    token: mgr.token,
    body: { assigned_to: techUser.user_id, assigned_team_id: itTeam.support_team_id, reason: "Reassigned" },
  });
  ok(reass.status === 200 && reass.data?.data?.assignment_id !== asgRow.assignment_id,
    "PATCH assignment creates replacement row",
    `got ${reass.status} new=${reass.data?.data?.assignment_id}`);
  const reassId = reass.data?.data?.assignment_id;
  ok((await req("DELETE", `/assignments/${reassId}`, { token: mgr.token })).status === 200,
    "DELETE assignment (unassign) -> 200");
  const evUn = await req("GET", `/ticket-events/ticket/${t1id}`, { token: mgr.token });
  ok((evUn.data?.data || []).some((e) => e.event_type === "UNASSIGNED"),
    "backend recorded UNASSIGNED event");
  ok((await req("GET", `/tickets/${t1id}`, { token: tech.token })).status === 403,
    "technician loses access after unassign -> 403");

  console.log("== NOTIFICATIONS ACTIONS ==");
  const readOne = await req("PATCH", `/notifications/${assignedNotif.notification_id}/read`, { token: tech.token });
  ok(readOne.status === 200 && readOne.data?.data?.is_read === true,
    "PATCH notification read -> is_read true", `got ${readOne.status}`);
  const readAll = await req("PATCH", "/notifications/read-all", { token: tech.token });
  ok(readAll.status === 200 && typeof readAll.data?.data?.updated_count === "number",
    "PATCH read-all -> updated_count", `got ${readAll.status}`);
  const unreadAfter = await req("GET", "/notifications?unread=true", { token: tech.token });
  ok(unreadAfter.status === 200 && (unreadAfter.data?.data || []).length === 0,
    "no unread notifications remain", `n=${unreadAfter.data?.data?.length}`);

  console.log("== SWAGGER (via frontend proxy) ==");
  const spec = await fetch("http://localhost:5000/api-docs.json").then((r) => r.json()).catch(() => null);
  ok(!!spec && !!(spec.swagger || spec.openapi) && Object.keys(spec.paths || {}).length > 10,
    "GET /api-docs.json serves the spec",
    JSON.stringify(spec && { s: spec.swagger || spec.openapi, paths: Object.keys(spec.paths || {}).length }));

  finish();
})().catch((e) => {
  console.error("E2E fatal:", e);
  process.exit(1);
});

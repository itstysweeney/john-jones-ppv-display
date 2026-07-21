const LOCAL_LEADS_KEY = "jj-event-leads";
let leads = [];

const list = document.querySelector("#leadList");
const message = document.querySelector("#leadMessage");
const emailTo = document.querySelector("#emailTo");

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function storedLeads() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_LEADS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLeads(value) {
  localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(value));
}

function leadDate(lead) {
  return lead.created_at ? new Date(lead.created_at).toLocaleString() : "Date not saved";
}

function render() {
  document.querySelector("#leadCount").textContent = `${leads.length} LEAD${leads.length === 1 ? "" : "S"}`;
  message.textContent = leads.length
    ? "These leads are saved on this board/browser."
    : "No event leads have been saved on this board/browser yet.";
  list.innerHTML = leads.map(lead => `<article class="lead">
    <div><h2>${escapeHtml(lead.name)}</h2><time>${escapeHtml(leadDate(lead))}</time></div>
    <button data-delete="${escapeHtml(lead.id)}">DELETE</button>
    <div class="lead-facts">
      <div><span>DEPARTMENT / AGENCY</span><strong>${escapeHtml(lead.department)}</strong></div>
      <div><span>PHONE</span><strong>${escapeHtml(lead.phone || "Not provided")}${lead.extension ? ` ext. ${escapeHtml(lead.extension)}` : ""}</strong></div>
      <div><span>EMAIL</span><strong>${escapeHtml(lead.email || "Not provided")}</strong></div>
    </div>
    ${lead.description ? `<p>${escapeHtml(lead.description)}</p>` : ""}
    ${lead.email_status ? `<p class="lead-status">${escapeHtml(lead.email_status)}</p>` : ""}
  </article>`).join("");
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
    if (!confirm("Delete this lead?")) return;
    leads = leads.filter(lead => lead.id !== button.dataset.delete);
    saveLeads(leads);
    render();
  }));
}

function loadLeads() {
  leads = storedLeads();
  render();
}

function leadSummary() {
  if (!leads.length) return "No event leads saved yet.";
  return leads.map((lead, index) => [
    `Lead ${index + 1}`,
    `Date: ${leadDate(lead)}`,
    `Name: ${lead.name || ""}`,
    `Department / Agency: ${lead.department || ""}`,
    `Phone: ${lead.phone || ""}${lead.extension ? ` ext. ${lead.extension}` : ""}`,
    `Email: ${lead.email || ""}`,
    `Notes: ${lead.description || ""}`
  ].join("\n")).join("\n\n");
}

function csvText() {
  const fields = ["created_at", "name", "department", "phone", "extension", "email", "description", "email_status", "source"];
  return [
    fields.join(","),
    ...leads.map(lead => fields.map(field => `"${String(lead[field] || "").replaceAll('"', '""')}"`).join(","))
  ].join("\r\n");
}

function downloadCsv() {
  if (!leads.length) {
    message.textContent = "No leads to export yet.";
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csvText()], {type: "text/csv"}));
  link.download = `ppv-event-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function emailSummary() {
  if (!leads.length) {
    message.textContent = "No leads to email yet.";
    return;
  }
  const to = emailTo.value.trim();
  const subject = encodeURIComponent(`PPV event leads - ${new Date().toLocaleDateString()}`);
  const body = encodeURIComponent(leadSummary());
  location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}

async function shareCsv() {
  if (!leads.length) {
    message.textContent = "No leads to share yet.";
    return;
  }
  const file = new File([csvText()], `ppv-event-leads-${new Date().toISOString().slice(0, 10)}.csv`, {type: "text/csv"});
  if (navigator.canShare?.({files: [file]})) {
    await navigator.share({title: "PPV Event Leads", text: "PPV event lead export", files: [file]});
    return;
  }
  downloadCsv();
  message.textContent = "CSV downloaded. If sharing is not available on this board, attach that file to an email.";
}

async function copyList() {
  if (!leads.length) {
    message.textContent = "No leads to copy yet.";
    return;
  }
  try {
    await navigator.clipboard.writeText(leadSummary());
    message.textContent = "Lead list copied.";
  } catch {
    message.textContent = "Copy is blocked on this device. Use Email Summary or Download CSV.";
  }
}

document.querySelector("#refreshLeads").addEventListener("click", loadLeads);
document.querySelector("#emailLeads").addEventListener("click", emailSummary);
document.querySelector("#shareLeads").addEventListener("click", () => shareCsv().catch(() => {
  downloadCsv();
  message.textContent = "Sharing was blocked. CSV downloaded instead.";
}));
document.querySelector("#copyLeads").addEventListener("click", copyList);
document.querySelector("#exportLeads").addEventListener("click", downloadCsv);
document.querySelector("#clearLeads").addEventListener("click", () => {
  if (!leads.length) return;
  if (!confirm("Clear all event leads from this board? Email or export them first.")) return;
  leads = [];
  saveLeads(leads);
  render();
});

emailTo.value = localStorage.getItem("jj-lead-email-to") || emailTo.value || "tsweeney@gmcity.com";
emailTo.addEventListener("change", () => localStorage.setItem("jj-lead-email-to", emailTo.value.trim()));
loadLeads();

const form = document.querySelector("#resumeForm");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const saveStatus = document.querySelector("#saveStatus");
const photoInput = document.querySelector("#photoInput");
const printButton = document.querySelector("#printResume");
const fillExampleButton = document.querySelector("#fillExample");
const clearDataButton = document.querySelector("#clearData");
const resumePreview = document.querySelector("#resumePreview");
const pageCount = document.querySelector("#pageCount");
const atsModeNote = document.querySelector("#atsModeNote");
const cropModal = document.querySelector("#cropModal");
const cropCanvas = document.querySelector("#cropCanvas");
const cropZoom = document.querySelector("#cropZoom");
const cropX = document.querySelector("#cropX");
const cropY = document.querySelector("#cropY");
const applyCropButton = document.querySelector("#applyCrop");
const cancelCropButton = document.querySelector("#cancelCrop");
const resetCropButton = document.querySelector("#resetCrop");

const state = {
  personal: {
    atsSafeMode: "on",
    compactMode: "on"
  },
  photo: "",
  skillOrder: ["technicalSkills", "softSkills", "certifications", "languages"],
  education: [{ college: "", degree: "", cgpa: "", years: "", details: "" }],
  schooling: [{ school: "", board: "", score: "", years: "", details: "" }],
  experience: [{ role: "", company: "", years: "", details: "" }],
  projects: [{ name: "", tech: "", link: "", details: "" }]
};

const templates = {
  education: [
    ["college", "College / University", ""],
    ["degree", "Degree", ""],
    ["cgpa", "CGPA / Percentage", ""],
    ["years", "Years", ""],
    ["details", "Highlights", "", "textarea"]
  ],
  schooling: [
    ["school", "School name", ""],
    ["board", "Board / Class", ""],
    ["score", "Score", ""],
    ["years", "Years", ""],
    ["details", "Highlights", "", "textarea"]
  ],
  experience: [
    ["role", "Role", ""],
    ["company", "Company", ""],
    ["years", "Duration", ""],
    ["details", "Impact bullets", "", "textarea"]
  ],
  projects: [
    ["name", "Project name", ""],
    ["tech", "Tools / Tech", ""],
    ["link", "Link", ""],
    ["details", "Impact bullets", "", "textarea"]
  ]
};

const draggableTypes = ["education", "schooling", "experience", "projects"];
const skillFields = {
  technicalSkills: { label: "Technical skills", type: "textarea", rows: 3, previewLabel: "Technical" },
  softSkills: { label: "Soft skills", type: "textarea", rows: 3, previewLabel: "Core" },
  certifications: { label: "Certifications", type: "textarea", rows: 3, previewLabel: "Certifications" },
  languages: { label: "Languages", type: "input", previewLabel: "Languages" }
};

const storageKey = "resume-maker-state-v3";
const pageHeightLimit = 1120;
const cropState = {
  image: null,
  zoom: 1,
  x: 0,
  y: 0
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed);
    state.personal = { atsSafeMode: "on", compactMode: "on", ...state.personal };
    normalizeStateShape();
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function normalizeStateShape() {
  state.skillOrder = [
    ...new Set([...(state.skillOrder || []), ...Object.keys(skillFields)])
  ].filter((key) => skillFields[key]);
  draggableTypes.forEach((type) => {
    if (!Array.isArray(state[type]) || !state[type].length) {
      state[type] = [Object.fromEntries(templates[type].map(([key]) => [key, ""]))];
    }
  });
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  saveStatus.textContent = "Saved";
}

function switchTab(tabName) {
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === tabName));
  panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tabName));
}

function entryCard(type, item, index) {
  const card = document.createElement("div");
  card.className = "entry-card";
  card.draggable = true;
  card.dataset.dragType = type;
  card.dataset.index = index;
  card.innerHTML = `
    <div class="entry-head">
      <div class="entry-title">
        <button class="drag-handle" type="button" data-drag-handle aria-label="Move ${capitalize(type)} ${index + 1}">::</button>
        <h3>${capitalize(type)} ${index + 1}</h3>
      </div>
      <button class="remove-button" type="button" data-remove="${type}" data-index="${index}">Remove</button>
    </div>
  `;

  templates[type].forEach(([key, label, placeholder, fieldType]) => {
    const wrap = document.createElement("label");
    wrap.textContent = label;
    const input = document.createElement(fieldType === "textarea" ? "textarea" : "input");
    input.name = `${type}.${index}.${key}`;
    input.placeholder = placeholder;
    input.value = item[key] || "";
    if (fieldType === "textarea") input.rows = 4;
    wrap.append(input);
    card.append(wrap);
  });

  return card;
}

function renderDynamicForms() {
  draggableTypes.forEach((type) => {
    const target = document.querySelector(`#${type}List`);
    target.innerHTML = "";
    state[type].forEach((item, index) => target.append(entryCard(type, item, index)));
  });
  renderSkillForms();
}

function renderSkillForms() {
  const target = document.querySelector("#skillsList");
  target.innerHTML = "";
  state.skillOrder.forEach((key, index) => target.append(skillCard(key, index)));
}

function skillCard(key, index) {
  const config = skillFields[key];
  const card = document.createElement("div");
  card.className = "entry-card skill-card";
  card.draggable = true;
  card.dataset.dragType = "skills";
  card.dataset.index = index;
  card.innerHTML = `
    <div class="entry-head">
      <div class="entry-title">
        <button class="drag-handle" type="button" data-drag-handle aria-label="Move ${config.label}">::</button>
        <h3>${config.label}</h3>
      </div>
    </div>
  `;

  const wrap = document.createElement("label");
  wrap.textContent = config.label;
  const input = document.createElement(config.type === "textarea" ? "textarea" : "input");
  input.name = key;
  input.value = state.personal[key] || "";
  if (config.type === "textarea") input.rows = config.rows || 3;
  wrap.append(input);
  card.append(wrap);
  return card;
}

function fillStaticFields() {
  Object.entries(state.personal || {}).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = value === "on" || value === true;
    } else {
      field.value = value;
    }
  });
}

function collectStaticFields() {
  const fields = form.querySelectorAll("input[name]:not([name*='.']), textarea[name]:not([name*='.'])");
  fields.forEach((field) => {
    state.personal[field.name] = field.type === "checkbox" ? (field.checked ? "on" : "") : field.value.trim();
  });
}

function handleDynamicInput(name, value) {
  const [type, index, key] = name.split(".");
  if (!state[type]?.[index]) return;
  state[type][index][key] = value.trim();
}

function splitList(value) {
  return (value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitBullets(value) {
  return (value || "")
    .split(/\n|\u2022/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getResumeText() {
  const p = state.personal;
  return [
    Object.values(p).join(" "),
    ...state.education.flatMap(Object.values),
    ...state.schooling.flatMap(Object.values),
    ...state.experience.flatMap(Object.values),
    ...state.projects.flatMap(Object.values)
  ].join(" ").toLowerCase();
}

function buildResumeBlocks() {
  const p = state.personal;
  const atsSafe = p.atsSafeMode === "on";
  const blocks = [];
  const header = document.createElement("header");
  header.className = "resume-header resume-block";
  header.innerHTML = `
    <div>
      ${p.fullName ? `<h2>${escapeHtml(p.fullName)}</h2>` : ""}
      ${p.targetRole ? `<div class="target-title">${escapeHtml(p.targetRole)}</div>` : ""}
      ${p.summary ? `<p>${escapeHtml(p.summary)}</p>` : ""}
      ${contactItems(p, atsSafe).length ? `<div class="contact-line">${contactItems(p, atsSafe).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
    </div>
    ${state.photo && !atsSafe ? `<img class="profile-photo" src="${state.photo}" alt="" />` : ""}
  `;
  if (p.fullName || p.targetRole || p.summary || contactItems(p, atsSafe).length || (state.photo && !atsSafe)) {
    blocks.push(header);
  }

  addSection(blocks, "Education", [
    ...state.education.filter(hasAnyValue).map((item) => itemBlock(
      [item.degree, item.college].filter(Boolean).join(" - "),
      [item.cgpa, item.years].filter(Boolean).join(" | "),
      splitBullets(item.details)
    )),
    ...state.schooling.filter(hasAnyValue).map((item) => itemBlock(
      [item.board, item.school].filter(Boolean).join(" - "),
      [item.score, item.years].filter(Boolean).join(" | "),
      splitBullets(item.details)
    ))
  ]);

  const skillRows = state.skillOrder
    .map((key) => [skillFields[key].previewLabel, splitList(p[key])])
    .filter(([, items]) => items.length);
  if (skillRows.length) {
    const skillBlock = document.createElement("div");
    skillBlock.className = "skill-cloud";
    skillBlock.innerHTML = skillRows
      .map(([label, items]) => `<div class="skill-line"><strong>${escapeHtml(label)}:</strong> ${items.map(escapeHtml).join(", ")}</div>`)
      .join("");
    addSection(blocks, "Skills", [skillBlock]);
  }

  addSection(blocks, "Experience", state.experience.filter(hasAnyValue).map((item) => itemBlock(
    [item.role, item.company].filter(Boolean).join(" - "),
    item.years || "",
    splitBullets(item.details)
  )));

  addSection(blocks, "Projects", state.projects.filter(hasAnyValue).map((item) => itemBlock(
    item.name || "",
    [item.tech, item.link].filter(Boolean).join(" | "),
    splitBullets(item.details)
  )));

  const extras = [
    ...splitBullets(p.achievements),
    ...splitList(p.interests).map((item) => `Interest: ${item}`)
  ];
  addSection(blocks, "Achievements & Extras", extras.map((item) => itemBlock("", "", [item])));

  return blocks;
}

function addSection(blocks, title, children = []) {
  if (!children.length) return;
  const section = document.createElement("section");
  section.className = "resume-section resume-block";
  section.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
  children.forEach((child) => section.append(child));
  blocks.push(section);
}

function itemBlock(title, meta, bullets) {
  const item = document.createElement("div");
  item.className = "resume-item";
  item.innerHTML = `
    ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
    ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
    ${bullets.length ? `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
  `;
  return item;
}

function renderPreview() {
  collectStaticFields();
  const blocks = buildResumeBlocks();
  const compact = state.personal.compactMode === "on";
  resumePreview.innerHTML = "";

  let currentPage = createPage(compact);
  resumePreview.append(currentPage);

  blocks.forEach((block) => {
    currentPage.append(block);
    if (currentPage.scrollHeight > pageHeightLimit && currentPage.children.length > 1) {
      block.remove();
      currentPage = createPage(compact);
      resumePreview.append(currentPage);
      currentPage.append(block);
    }
  });

  const pages = [...resumePreview.querySelectorAll(".resume-page")];
  pageCount.textContent = `${pages.length} ${pages.length === 1 ? "page" : "pages"}`;
  atsModeNote.textContent = state.personal.atsSafeMode === "on"
    ? "ATS-safe mode keeps photo and age out of the resume."
    : "Visual mode includes optional photo and age.";
  updateAtsScore();
}

function createPage(compact) {
  const page = document.createElement("article");
  page.className = `resume-page${compact ? " compact" : ""}`;
  page.setAttribute("aria-label", "Generated resume page");
  return page;
}

function updateAtsScore() {
  const p = state.personal;
  const text = getResumeText();
  const jdKeywords = extractKeywords(`${p.jobDescription || ""} ${p.targetKeywords || ""}`);
  const coverage = keywordCoverage(text, jdKeywords);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const impactItems = [...state.experience, ...state.projects].flatMap((item) => splitBullets(item.details)).filter(hasImpact);

  const categories = [
    {
      name: "Parse",
      points: 18,
      earned: scoreBool(p.fullName && p.email && p.phone, 7)
        + scoreBool(hasStandardSections(), 7)
        + scoreBool(p.atsSafeMode === "on", 4),
      tip: "Keep standard headings and complete contact details"
    },
    {
      name: "Match",
      points: 24,
      earned: Math.round(coverage * 18) + scoreBool(Boolean(p.targetRole), 6),
      tip: "Mirror exact job-description keywords naturally"
    },
    {
      name: "Impact",
      points: 22,
      earned: Math.min(16, impactItems.length * 4) + scoreBool(/\d/.test(text), 6),
      tip: "Add numbers, outcomes, and action verbs"
    },
    {
      name: "Skills",
      points: 16,
      earned: scoreRange(splitList(p.technicalSkills).length, 8, 10) + scoreRange(splitList(p.softSkills).length, 3, 4) + scoreBool(Boolean(p.certifications), 2),
      tip: "Add role-specific tools, soft skills, and certifications"
    },
    {
      name: "Focus",
      points: 20,
      earned: scoreBool(p.summary && p.summary.length >= 90, 6)
        + scoreBool(wordCount >= 120 && wordCount <= 900, 6)
        + scoreBool(state.education.some((item) => item.college && item.degree && item.cgpa), 4)
        + scoreBool(state.projects.some((item) => item.name && item.tech), 4),
      tip: "Use a short objective, clear education, and focused project proof"
    }
  ];

  const score = Math.min(100, categories.reduce((sum, item) => sum + item.earned, 0));
  const missing = categories
    .filter((item) => item.earned < item.points)
    .sort((a, b) => (a.earned / a.points) - (b.earned / b.points))
    .slice(0, 4)
    .map((item) => item.tip);

  document.querySelector("#atsScore").textContent = score;
  const meter = document.querySelector("#scoreMeter");
  meter.style.width = `${score}%`;
  meter.style.background = score >= 80 ? "var(--ok)" : score >= 55 ? "var(--warn)" : "var(--accent)";
  document.querySelector("#scoreBreakdown").innerHTML = categories
    .map((item) => `<div class="score-chip"><span>${escapeHtml(item.name)}</span><strong>${item.earned}/${item.points}</strong></div>`)
    .join("");
  document.querySelector("#scoreTips").innerHTML = missing.length
    ? missing.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")
    : "<li>Resume is strong for ATS parsing and recruiter review</li>";
}

function extractKeywords(value) {
  const stopWords = new Set(["and", "the", "with", "for", "that", "this", "from", "your", "you", "are", "will", "our", "into", "have", "has", "using", "work", "role"]);
  return splitList(value)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((word) => word.toLowerCase().replace(/[^a-z0-9+#.]/g, ""))
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .filter((word, index, list) => list.indexOf(word) === index)
    .slice(0, 30);
}

function keywordCoverage(text, keywords) {
  if (!keywords.length) return 0;
  const hits = keywords.filter((word) => text.includes(word)).length;
  return hits / keywords.length;
}

function hasStandardSections() {
  return state.education.some(hasAnyValue) && splitList(state.personal.technicalSkills).length > 0 && state.projects.some(hasAnyValue);
}

function hasImpact(value) {
  return /\d|increased|reduced|improved|built|created|automated|led|managed|optimized|delivered|owned|launched|saved/i.test(value || "");
}

function hasAnyValue(item) {
  return Object.values(item).some(Boolean);
}

function scoreBool(condition, points) {
  return condition ? points : 0;
}

function scoreRange(actual, required, points) {
  return Math.min(points, Math.round((actual / required) * points));
}

function contactItems(p, atsSafe) {
  return [p.email, p.phone, p.address, !atsSafe && p.age ? `Age ${p.age}` : "", p.linkedin, p.portfolio].filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fillExample() {
  state.personal = {
    targetRole: "Software Engineer Intern",
    jobDescription: "Build responsive web applications using React, JavaScript, SQL, APIs, analytics dashboards, collaboration, and problem solving.",
    targetKeywords: "React, JavaScript, SQL, APIs, analytics, dashboard, collaboration, problem solving",
    atsSafeMode: "on",
    compactMode: "on",
    fullName: "Bharath Sai Pulipati",
    email: "bharath@example.com",
    phone: "+91 98765 43210",
    address: "Hyderabad, Telangana",
    age: "21",
    linkedin: "linkedin.com/in/bharath",
    portfolio: "bharath.dev",
    summary: "Seeking a software engineering internship where I can apply React, JavaScript, SQL, and analytics experience to build reliable products for business users.",
    technicalSkills: "React, JavaScript, SQL, Python, APIs, Power BI, HTML, CSS",
    softSkills: "Leadership, communication, teamwork, problem solving",
    certifications: "Google Data Analytics, JavaScript Algorithms",
    languages: "English, Hindi, Telugu",
    achievements: "Won a campus hackathon for building an analytics dashboard used by 120 students\nLed a 4-member project team and delivered the prototype 2 weeks early",
    interests: "Product strategy, analytics, public speaking"
  };
  state.education = [{ college: "ABC College", degree: "B.Tech Computer Science", cgpa: "8.7 CGPA", years: "2022 - 2026", details: "Coursework in data structures, databases, web engineering, and analytics" }];
  state.schooling = [{ school: "ABC High School", board: "CBSE Class XII", score: "92%", years: "2020 - 2022", details: "Science stream with mathematics and computer science" }];
  state.experience = [{ role: "Data Analyst Intern", company: "Growth Labs", years: "May 2025 - Aug 2025", details: "Built Power BI dashboards for 5 business teams\nAutomated weekly SQL reports and saved 6 hours per week\nImproved stakeholder decision speed by 30%" }];
  state.projects = [
    { name: "AI Resume Analyzer", tech: "React, JavaScript, NLP", link: "github.com/bharath/resume-ai", details: "Created an ATS-friendly resume generator with instant scoring\nMatched resume text against 30 target job keywords\nGenerated a printable multi-page resume in under 1 second" },
    { name: "Sales Dashboard", tech: "SQL, Power BI, Excel", link: "", details: "Analyzed 10,000 sales records\nBuilt dashboard views for revenue, region, and product trends\nReduced manual reporting time by 40%" }
  ];
  renderDynamicForms();
  fillStaticFields();
  persist();
  renderPreview();
}

function openCropper(dataUrl) {
  const image = new Image();
  image.onload = () => {
    cropState.image = image;
    resetCropValues();
    cropModal.classList.add("is-open");
    cropModal.setAttribute("aria-hidden", "false");
    renderCropCanvas();
  };
  image.src = dataUrl;
}

function resetCropValues() {
  cropState.zoom = 1;
  cropState.x = 0;
  cropState.y = 0;
  cropZoom.value = "1";
  cropX.value = "0";
  cropY.value = "0";
}

function renderCropCanvas() {
  if (!cropState.image) return;
  const canvas = cropCanvas;
  const context = canvas.getContext("2d");
  const size = canvas.width;
  const image = cropState.image;
  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * cropState.zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2 + cropState.x;
  const y = (size - height) / 2 + cropState.y;

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);
  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 2;
  context.strokeRect(18, 18, size - 36, size - 36);
}

function closeCropper() {
  cropModal.classList.remove("is-open");
  cropModal.setAttribute("aria-hidden", "true");
  photoInput.value = "";
}

function applyCroppedPhoto() {
  if (!cropState.image) return;
  state.photo = cropCanvas.toDataURL("image/jpeg", 0.92);
  persist();
  renderPreview();
  closeCropper();
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

form.addEventListener("input", (event) => {
  saveStatus.textContent = "Saving";
  if (event.target.name.includes(".")) {
    handleDynamicInput(event.target.name, event.target.value);
  } else {
    collectStaticFields();
  }
  persist();
  renderPreview();
});

document.addEventListener("click", (event) => {
  const addType = event.target.dataset?.add;
  const removeType = event.target.dataset?.remove;

  if (addType) {
    const empty = Object.fromEntries(templates[addType].map(([key]) => [key, ""]));
    state[addType].push(empty);
    renderDynamicForms();
    persist();
    renderPreview();
  }

  if (removeType) {
    const index = Number(event.target.dataset.index);
    state[removeType].splice(index, 1);
    if (!state[removeType].length) {
      state[removeType].push(Object.fromEntries(templates[removeType].map(([key]) => [key, ""])));
    }
    renderDynamicForms();
    persist();
    renderPreview();
  }
});

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("[data-drag-handle]");
  const card = handle?.closest(".entry-card[data-drag-type]");
  if (card) card.dataset.dragReady = "true";
});

document.addEventListener("pointerup", () => {
  document.querySelectorAll(".entry-card[data-drag-ready]").forEach((card) => delete card.dataset.dragReady);
});

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".entry-card[data-drag-type]");
  if (!card || card.dataset.dragReady !== "true") {
    event.preventDefault();
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify({
    type: card.dataset.dragType,
    index: Number(card.dataset.index)
  }));
  card.classList.add("is-dragging");
});

document.addEventListener("dragend", (event) => {
  const card = event.target.closest(".entry-card");
  if (card) {
    card.classList.remove("is-dragging");
    delete card.dataset.dragReady;
  }
  document.querySelectorAll(".entry-card.is-drop-target").forEach((card) => card.classList.remove("is-drop-target"));
});

document.addEventListener("dragover", (event) => {
  const card = event.target.closest(".entry-card[data-drag-type]");
  if (!card) return;
  event.preventDefault();
  card.classList.add("is-drop-target");
});

document.addEventListener("dragleave", (event) => {
  event.target.closest(".entry-card")?.classList.remove("is-drop-target");
});

document.addEventListener("drop", (event) => {
  const card = event.target.closest(".entry-card[data-drag-type]");
  if (!card) return;
  event.preventDefault();
  card.classList.remove("is-drop-target");

  try {
    const from = JSON.parse(event.dataTransfer.getData("text/plain"));
    const to = {
      type: card.dataset.dragType,
      index: Number(card.dataset.index)
    };
    if (from.type !== to.type || from.index === to.index) return;
    reorderEntries(from.type, from.index, to.index);
  } catch {
    return;
  }
});

function reorderEntries(type, fromIndex, toIndex) {
  const list = type === "skills" ? state.skillOrder : state[type];
  if (!Array.isArray(list) || !list[fromIndex] || !list[toIndex]) return;
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  renderDynamicForms();
  persist();
  renderPreview();
}

photoInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    openCropper(reader.result);
  };
  reader.readAsDataURL(file);
});

[cropZoom, cropX, cropY].forEach((control) => {
  control.addEventListener("input", () => {
    cropState.zoom = Number(cropZoom.value);
    cropState.x = Number(cropX.value);
    cropState.y = Number(cropY.value);
    renderCropCanvas();
  });
});

applyCropButton.addEventListener("click", applyCroppedPhoto);
cancelCropButton.addEventListener("click", closeCropper);
resetCropButton.addEventListener("click", () => {
  resetCropValues();
  renderCropCanvas();
});

printButton.addEventListener("click", () => {
  collectStaticFields();
  persist();
  renderPreview();
  window.print();
});

fillExampleButton.addEventListener("click", fillExample);

clearDataButton.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem("resume-maker-state-v1");
  localStorage.removeItem("resume-maker-state-v2");
  window.location.reload();
});

loadState();
normalizeStateShape();
renderDynamicForms();
fillStaticFields();
renderPreview();

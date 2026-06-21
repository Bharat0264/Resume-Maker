const form = document.querySelector("#resumeForm");
const appShell = document.querySelector(".app-shell");
const loginScreen = document.querySelector("#loginScreen");
const loginForm = document.querySelector("#loginForm");
const userStrip = document.querySelector("#userStrip");
const logoutButton = document.querySelector("#logoutButton");
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
const existingModal = document.querySelector("#existingModal");
const existingTitle = document.querySelector("#existingTitle");
const existingList = document.querySelector("#existingList");
const closeExistingButton = document.querySelector("#closeExisting");

const state = {
  personal: {
    atsSafeMode: "on",
    compactMode: "on"
  },
  photo: "",
  skillOrder: ["technicalSkills", "softSkills", "languages"],
  education: [{ college: "", degree: "", cgpa: "", years: "", details: "" }],
  schooling: [{ school: "", board: "", score: "", years: "", details: "" }],
  certifications: [{ title: "", issuer: "", validity: "", details: "" }],
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
  certifications: [
    ["title", "Certificate title", ""],
    ["issuer", "Issuing platform", ""],
    ["validity", "Validity details", ""],
    ["details", "Description", "", "textarea"]
  ],
  experience: [
    ["role", "Role", ""],
    ["company", "Company", ""],
    ["years", "Duration", ""],
    ["details", "Description", "", "textarea"]
  ],
  projects: [
    ["name", "Project name", ""],
    ["tech", "Tools / Tech", ""],
    ["link", "Link", ""],
    ["details", "Description", "", "textarea"]
  ]
};

const draggableTypes = ["education", "schooling", "certifications", "experience", "projects"];
const reusableTypes = [...draggableTypes, "skills"];
const skillFields = {
  technicalSkills: { label: "Technical skills", type: "textarea", rows: 3, previewLabel: "Technical" },
  softSkills: { label: "Soft skills", type: "textarea", rows: 3, previewLabel: "Core" },
  languages: { label: "Languages", type: "input", previewLabel: "Languages" }
};

const storageKey = "resume-maker-state-v3";
const accountsKey = "resume-maker-accounts-v1";
const sessionKey = "resume-maker-current-user";
const pageHeightLimit = 1120;
let currentUserId = "";
let accounts = {};
const cropState = {
  image: null,
  zoom: 1,
  x: 0,
  y: 0
};

function loadState() {
  const account = accounts[currentUserId];
  const saved = account?.resume ? JSON.stringify(account.resume) : localStorage.getItem(storageKey);
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
  if (state.personal?.certifications && (!Array.isArray(state.certifications) || !state.certifications.some(hasAnyValue))) {
    state.certifications = splitList(state.personal.certifications).map((title) => ({ title, issuer: "", validity: "", details: "" }));
    delete state.personal.certifications;
  }
  draggableTypes.forEach((type) => {
    if (!Array.isArray(state[type]) || !state[type].length) {
      state[type] = [Object.fromEntries(templates[type].map(([key]) => [key, ""]))];
    }
  });
}

function persist() {
  if (currentUserId) {
    collectReusableDetails();
    accounts[currentUserId] = {
      ...accounts[currentUserId],
      resume: JSON.parse(JSON.stringify(state)),
      updatedAt: new Date().toISOString()
    };
    saveAccounts();
  } else {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
  saveStatus.textContent = "Saved";
}

function readAccounts() {
  try {
    return JSON.parse(localStorage.getItem(accountsKey)) || {};
  } catch {
    localStorage.removeItem(accountsKey);
    return {};
  }
}

function saveAccounts() {
  localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function loginUser(name, email) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName || !cleanEmail) return;
  currentUserId = cleanEmail;
  accounts[currentUserId] = accounts[currentUserId] || {
    name: cleanName,
    email: cleanEmail,
    library: createEmptyLibrary(),
    resume: null,
    createdAt: new Date().toISOString()
  };
  accounts[currentUserId].name = cleanName;
  accounts[currentUserId].email = cleanEmail;
  accounts[currentUserId].library = {
    ...createEmptyLibrary(),
    ...(accounts[currentUserId].library || {})
  };
  localStorage.setItem(sessionKey, currentUserId);
  saveAccounts();
  bootAppForUser();
}

function bootAppForUser() {
  if (!currentUserId || !accounts[currentUserId]) {
    showLogin();
    return;
  }
  hideLogin();
  Object.assign(state, getFreshState());
  loadState();
  normalizeStateShape();
  prefillNewUserDetails();
  renderDynamicForms();
  fillStaticFields();
  renderPreview();
  persist();
}

function showLogin() {
  loginScreen.classList.remove("is-hidden");
  appShell.classList.add("is-locked");
}

function hideLogin() {
  loginScreen.classList.add("is-hidden");
  appShell.classList.remove("is-locked");
  const account = accounts[currentUserId];
  userStrip.textContent = account ? `Signed in as ${account.name} (${account.email})` : "";
}

function getFreshState() {
  return {
    personal: {
      atsSafeMode: "on",
      compactMode: "on"
    },
    photo: "",
    skillOrder: ["technicalSkills", "softSkills", "languages"],
    education: [{ college: "", degree: "", cgpa: "", years: "", details: "" }],
    schooling: [{ school: "", board: "", score: "", years: "", details: "" }],
    certifications: [{ title: "", issuer: "", validity: "", details: "" }],
    experience: [{ role: "", company: "", years: "", details: "" }],
    projects: [{ name: "", tech: "", link: "", details: "" }]
  };
}

function prefillNewUserDetails() {
  const account = accounts[currentUserId];
  if (!state.personal.fullName) state.personal.fullName = account.name || "";
  if (!state.personal.email) state.personal.email = account.email || "";
}

function createEmptyLibrary() {
  return reusableTypes.reduce((library, type) => {
    library[type] = [];
    return library;
  }, {});
}

function getLibrary() {
  if (!accounts[currentUserId]) return createEmptyLibrary();
  accounts[currentUserId].library = {
    ...createEmptyLibrary(),
    ...(accounts[currentUserId].library || {})
  };
  reusableTypes.forEach((type) => {
    accounts[currentUserId].library[type] = dedupeLibraryEntries(type, accounts[currentUserId].library[type]);
  });
  return accounts[currentUserId].library;
}

function collectReusableDetails() {
  if (!currentUserId) return;
  const library = getLibrary();
  draggableTypes.forEach((type) => {
    state[type].filter((item) => isReusableReady(type, item)).forEach((item) => addToLibrary(type, item, false));
  });
  const skillSet = getCurrentSkillSet();
  if (isReusableReady("skills", skillSet)) addToLibrary("skills", skillSet, false);
  accounts[currentUserId].library = library;
}

function addToLibrary(type, item, shouldSave = true, force = false) {
  const library = getLibrary();
  const cleanItem = cleanLibraryItem(type, item);
  if (!force && !isReusableReady(type, cleanItem)) return;
  if (force && !hasAnyValue(cleanItem)) return;
  const existingIndex = library[type].findIndex((entry) => isSameLibraryItem(type, entry, cleanItem));
  if (existingIndex >= 0) {
    library[type][existingIndex] = cleanItem;
  } else {
    library[type].unshift(cleanItem);
  }
  library[type] = dedupeLibraryEntries(type, library[type], force).slice(0, 30);
  if (shouldSave) {
    accounts[currentUserId].library = library;
    saveAccounts();
  }
}

function cleanLibraryItem(type, item) {
  if (type === "skills") {
    return Object.fromEntries(Object.keys(skillFields).map((key) => [key, (item[key] || "").trim()]));
  }
  return Object.fromEntries(templates[type].map(([key]) => [key, (item[key] || "").trim()]));
}

function getItemSignature(item) {
  return JSON.stringify(item).toLowerCase();
}

function getIdentityFields(type) {
  return {
    education: ["college", "degree"],
    schooling: ["school", "board"],
    certifications: ["title", "issuer"],
    experience: ["company", "role"],
    projects: ["name", "link"],
    skills: []
  }[type] || [];
}

function isSameLibraryItem(type, first, second) {
  const firstClean = cleanLibraryItem(type, first);
  const secondClean = cleanLibraryItem(type, second);
  if (getItemSignature(firstClean) === getItemSignature(secondClean)) return true;

  const identityMatch = getIdentityFields(type).some((key) => {
    const left = normalizeLibraryValue(firstClean[key]);
    const right = normalizeLibraryValue(secondClean[key]);
    return isSameLibraryValue(left, right);
  });
  if (identityMatch) return true;

  return isSubsetItem(firstClean, secondClean) || isSubsetItem(secondClean, firstClean);
}

function isSubsetItem(candidate, fullItem) {
  const filled = Object.entries(candidate).filter(([, value]) => normalizeLibraryValue(value));
  if (!filled.length) return false;
  return filled.every(([key, value]) => isSameLibraryValue(normalizeLibraryValue(fullItem[key]), normalizeLibraryValue(value)));
}

function normalizeLibraryValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isSameLibraryValue(first, second) {
  if (!first || !second) return false;
  if (first === second) return true;
  const shorter = first.length <= second.length ? first : second;
  const longer = first.length > second.length ? first : second;
  return shorter.length >= 4 && longer.startsWith(shorter);
}

function dedupeLibraryEntries(type, entries = [], keepDrafts = false) {
  return entries.filter((entry) => keepDrafts ? hasAnyValue(cleanLibraryItem(type, entry)) : isReusableReady(type, entry)).reduce((result, entry) => {
    const cleanEntry = cleanLibraryItem(type, entry);
    const existingIndex = result.findIndex((saved) => isSameLibraryItem(type, saved, cleanEntry));
    if (existingIndex >= 0) {
      if (getEntryCompleteness(cleanEntry) >= getEntryCompleteness(result[existingIndex])) {
        result[existingIndex] = cleanEntry;
      }
    } else {
      result.push(cleanEntry);
    }
    return result;
  }, []);
}

function countFilledFields(item) {
  return Object.values(item).filter((value) => String(value || "").trim()).length;
}

function getEntryCompleteness(item) {
  return countFilledFields(item) * 1000 + Object.values(item).join(" ").trim().length;
}

function isReusableReady(type, item) {
  const cleanItem = type === "skills" ? cleanLibraryItem("skills", item) : cleanLibraryItem(type, item);
  if (type === "education") return hasLongValue(cleanItem.college) && hasAnySupportingValue(cleanItem, ["degree", "cgpa", "years", "details"]);
  if (type === "schooling") return hasLongValue(cleanItem.school) && hasAnySupportingValue(cleanItem, ["board", "score", "years", "details"]);
  if (type === "certifications") return hasLongValue(cleanItem.title) && hasAnySupportingValue(cleanItem, ["issuer", "validity", "details"]);
  if (type === "experience") return hasAnySupportingValue(cleanItem, ["role", "company", "years", "details"]);
  if (type === "projects") return hasLongValue(cleanItem.name) || hasLongValue(cleanItem.details, 12);
  if (type === "skills") return Object.values(cleanItem).some((value) => hasLongValue(value, 4));
  return hasAnyValue(cleanItem);
}

function hasLongValue(value, minLength = 4) {
  return String(value || "").trim().length >= minLength;
}

function hasAnySupportingValue(item, keys) {
  return keys.some((key) => hasLongValue(item[key], 2));
}

function getCurrentSkillSet() {
  return Object.fromEntries(Object.keys(skillFields).map((key) => [key, state.personal[key] || ""]));
}

function saveCurrentEntries(type) {
  if (type === "skills") {
    collectStaticFields();
    addToLibrary("skills", getCurrentSkillSet(), true, true);
  } else if (state[type]) {
    state[type].filter(hasAnyValue).forEach((item) => addToLibrary(type, item, false, true));
    saveAccounts();
  }
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

function openExistingPicker(type) {
  const library = getLibrary();
  library[type] = dedupeLibraryEntries(type, library[type] || [], true);
  saveAccounts();
  const entries = library[type] || [];
  existingTitle.textContent = `Add from existing ${type === "skills" ? "skills" : capitalize(type)}`;
  existingList.innerHTML = entries.length
    ? entries.map((item, index) => existingOption(type, item, index)).join("")
    : `<div class="empty-existing">No saved ${type} yet. Add details once and they will appear here.</div>`;
  existingModal.dataset.type = type;
  existingModal.classList.add("is-open");
  existingModal.setAttribute("aria-hidden", "false");
}

function existingOption(type, item, index) {
  return `
    <button class="existing-option" type="button" data-use-existing="${type}" data-index="${index}">
      <strong>${escapeHtml(getExistingTitle(type, item))}</strong>
      <span>${escapeHtml(getExistingMeta(type, item))}</span>
    </button>
  `;
}

function getExistingTitle(type, item) {
  if (type === "education") return [item.degree, item.college].filter(Boolean).join(" - ") || "Education detail";
  if (type === "schooling") return [item.board, item.school].filter(Boolean).join(" - ") || "Schooling detail";
  if (type === "certifications") return item.title || "Certification detail";
  if (type === "experience") return [item.role, item.company].filter(Boolean).join(" - ") || "Experience detail";
  if (type === "projects") return item.name || "Project detail";
  return splitList(item.technicalSkills || item.softSkills || item.certifications || item.languages).slice(0, 4).join(", ") || "Skill set";
}

function getExistingMeta(type, item) {
  if (type === "skills") {
    return Object.keys(skillFields)
      .map((key) => item[key])
      .filter(Boolean)
      .join(" | ");
  }
  return Object.values(item).filter(Boolean).join(" | ");
}

function closeExistingPicker() {
  existingModal.classList.remove("is-open");
  existingModal.setAttribute("aria-hidden", "true");
  existingList.innerHTML = "";
}

function useExistingItem(type, index) {
  const item = getLibrary()[type]?.[index];
  if (!item) return;
  if (type === "skills") {
    Object.keys(skillFields).forEach((key) => {
      if (item[key]) state.personal[key] = item[key];
    });
    fillStaticFields();
  } else {
    const cleanItem = cleanLibraryItem(type, item);
    if (state[type].length === 1 && !hasAnyValue(state[type][0])) {
      state[type][0] = cleanItem;
    } else {
      state[type].push(cleanItem);
    }
    renderDynamicForms();
  }
  persist();
  renderPreview();
  closeExistingPicker();
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
    ...state.certifications.flatMap(Object.values),
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

  addSection(blocks, "Certifications", state.certifications.filter(hasAnyValue).map((item) => itemBlock(
    item.title || "",
    [item.issuer, item.validity].filter(Boolean).join(" | "),
    item.details || "",
    "description"
  )));

  addSection(blocks, "Experience", state.experience.filter(hasAnyValue).map((item) => itemBlock(
    [item.role, item.company].filter(Boolean).join(" - "),
    item.years || "",
    item.details || "",
    "description"
  )));

  addSection(blocks, "Projects", state.projects.filter(hasAnyValue).map((item) => itemBlock(
    item.name || "",
    [item.tech, item.link].filter(Boolean).join(" | "),
    item.details || "",
    "description"
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

function itemBlock(title, meta, content, mode = "bullets") {
  const item = document.createElement("div");
  item.className = "resume-item";
  const description = normalizeDescription(content);
  const body = mode === "description"
    ? `${description ? `<p>${escapeHtml(description)}</p>` : ""}`
    : `${content.length ? `<ul>${content.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}`;
  item.innerHTML = `
    ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
    ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
    ${body}
  `;
  return item;
}

function normalizeDescription(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
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
      earned: scoreRange(splitList(p.technicalSkills).length, 8, 10) + scoreRange(splitList(p.softSkills).length, 3, 4) + scoreBool(state.certifications.some((item) => item.title && item.issuer), 2),
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
    languages: "English, Hindi, Telugu",
    achievements: "Won a campus hackathon for building an analytics dashboard used by 120 students\nLed a 4-member project team and delivered the prototype 2 weeks early",
    interests: "Product strategy, analytics, public speaking"
  };
  state.education = [{ college: "ABC College", degree: "B.Tech Computer Science", cgpa: "8.7 CGPA", years: "2022 - 2026", details: "Coursework in data structures, databases, web engineering, and analytics" }];
  state.schooling = [{ school: "ABC High School", board: "CBSE Class XII", score: "92%", years: "2020 - 2022", details: "Science stream with mathematics and computer science" }];
  state.certifications = [
    { title: "Google Data Analytics", issuer: "Coursera", validity: "Issued 2025", details: "Completed practical analytics training covering spreadsheets, SQL, visualization, and data-driven decision making." },
    { title: "JavaScript Algorithms", issuer: "freeCodeCamp", validity: "Lifetime", details: "Practiced JavaScript fundamentals, algorithmic problem solving, and reusable coding patterns." }
  ];
  state.experience = [{ role: "Data Analyst Intern", company: "Growth Labs", years: "May 2025 - Aug 2025", details: "Built Power BI dashboards for 5 business teams, automated weekly SQL reports to save 6 hours per week, and improved stakeholder decision speed by 30%." }];
  state.projects = [
    { name: "AI Resume Analyzer", tech: "React, JavaScript, NLP", link: "github.com/bharath/resume-ai", details: "Created an ATS-friendly resume generator with instant scoring, keyword matching against target job descriptions, and printable multi-page resume output in under 1 second." },
    { name: "Sales Dashboard", tech: "SQL, Power BI, Excel", link: "", details: "Analyzed 10,000 sales records and built dashboard views for revenue, region, and product trends, reducing manual reporting time by 40%." }
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

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginUser(loginForm.elements.loginName.value, loginForm.elements.loginEmail.value);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  currentUserId = "";
  showLogin();
});

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
  const clickedControl = event.target.closest("button");
  const addType = clickedControl?.dataset?.add;
  const removeType = clickedControl?.dataset?.remove;
  const existingType = clickedControl?.dataset?.existing;
  const saveCurrentType = clickedControl?.dataset?.saveCurrent;
  const useExistingType = clickedControl?.dataset?.useExisting;

  if (addType) {
    const empty = Object.fromEntries(templates[addType].map(([key]) => [key, ""]));
    state[addType].push(empty);
    renderDynamicForms();
    persist();
    renderPreview();
  }

  if (existingType) {
    collectReusableDetails();
    saveAccounts();
    openExistingPicker(existingType);
  }

  if (saveCurrentType) {
    saveCurrentEntries(saveCurrentType);
  }

  if (useExistingType) {
    useExistingItem(useExistingType, Number(clickedControl.dataset.index));
  }

  if (removeType) {
    const index = Number(clickedControl.dataset.index);
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
closeExistingButton.addEventListener("click", closeExistingPicker);
existingModal.addEventListener("click", (event) => {
  if (event.target === existingModal) closeExistingPicker();
});

printButton.addEventListener("click", () => {
  collectStaticFields();
  persist();
  renderPreview();
  window.print();
});

fillExampleButton.addEventListener("click", fillExample);

clearDataButton.addEventListener("click", () => {
  if (currentUserId && accounts[currentUserId]) {
    accounts[currentUserId].resume = getFreshState();
    accounts[currentUserId].library = createEmptyLibrary();
    saveAccounts();
  }
  localStorage.removeItem(storageKey);
  localStorage.removeItem("resume-maker-state-v1");
  localStorage.removeItem("resume-maker-state-v2");
  window.location.reload();
});

accounts = readAccounts();
currentUserId = localStorage.getItem(sessionKey) || "";
if (currentUserId && accounts[currentUserId]) {
  bootAppForUser();
} else {
  showLogin();
}

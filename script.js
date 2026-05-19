const DEFAULT_MODEL = "gpt-5.4-mini";
const MAX_LLM_ATTEMPTS = 3;
const LEGACY_STORAGE_KEY = "Word2DrawGenerator:UserSettings";
const RECENT_WORD_LIMIT = 8;
const ICONS = {
  lockOpen: "&#128275;",
  lockClosed: "&#128274;",
  reroll: "&#128260;",
};
const WORD_STOPLIST = new Set([
  "and",
  "the",
  "with",
  "from",
  "into",
  "inside",
  "outside",
  "before",
  "after",
  "near",
  "over",
  "under",
  "through",
  "beside",
  "during",
  "while",
  "very",
]);

const categories = [
  {
    id: "time",
    words: {
      easy: [
        "morning",
        "night",
        "summer",
        "winter",
        "sunset",
        "today",
        "weekend",
        "birthday",
      ],
      medium: [
        "dawn",
        "midnight",
        "golden hour",
        "festival night",
        "rainy morning",
        "future",
        "yesterday",
        "first snow",
      ],
      hard: [
        "eclipse",
        "last century",
        "time loop",
        "forgotten era",
        "parallel noon",
        "vanishing season",
        "after midnight",
        "before memory",
      ],
    },
  },
  {
    id: "place",
    words: {
      easy: [
        "park",
        "beach",
        "bedroom",
        "forest",
        "school",
        "kitchen",
        "garden",
        "street",
      ],
      medium: [
        "rooftop",
        "harbor",
        "library",
        "market",
        "train station",
        "greenhouse",
        "desert road",
        "art museum",
      ],
      hard: [
        "moon base",
        "abandoned observatory",
        "floating city",
        "crystal cave",
        "sunken theater",
        "clockwork village",
        "edge of space",
        "inside a painting",
      ],
    },
  },
  {
    id: "action",
    words: {
      easy: [
        "running",
        "sleeping",
        "jumping",
        "eating",
        "reading",
        "drawing",
        "waving",
        "sitting",
      ],
      medium: [
        "floating",
        "discovering",
        "escaping",
        "planting",
        "dancing",
        "building",
        "whispering",
        "rescuing",
      ],
      hard: [
        "negotiating",
        "transforming",
        "camouflaging",
        "conducting",
        "unraveling",
        "levitating",
        "decoding",
        "balancing",
      ],
    },
  },
  {
    id: "adjective",
    words: {
      easy: [
        "happy",
        "small",
        "big",
        "bright",
        "cold",
        "warm",
        "soft",
        "funny",
      ],
      medium: [
        "ancient",
        "tiny",
        "glowing",
        "melancholy",
        "chaotic",
        "velvety",
        "impossible",
        "gentle",
      ],
      hard: [
        "transparent",
        "ornamental",
        "fractured",
        "weightless",
        "iridescent",
        "overgrown",
        "mythic",
        "contradictory",
      ],
    },
  },
  {
    id: "object",
    words: {
      easy: ["ball", "chair", "book", "hat", "cup", "key", "shoe", "flower"],
      medium: [
        "lantern",
        "umbrella",
        "compass",
        "teacup",
        "mirror",
        "suitcase",
        "telescope",
        "paper crown",
      ],
      hard: [
        "broken automaton",
        "glass violin",
        "mechanical heart",
        "map of dreams",
        "orbital clock",
        "folded doorway",
        "singing mask",
        "impossible machine",
      ],
    },
  },
  {
    id: "animal",
    words: {
      easy: ["cat", "dog", "bird", "fish", "rabbit", "horse", "bear", "frog"],
      medium: [
        "fox",
        "octopus",
        "moth",
        "whale",
        "heron",
        "turtle",
        "dragonfly",
        "seal",
      ],
      hard: [
        "axolotl",
        "pangolin",
        "narwhal",
        "mantis shrimp",
        "cassowary",
        "chameleon",
        "leafy seadragon",
        "glass frog",
      ],
    },
  },
  {
    id: "person",
    words: {
      easy: [
        "child",
        "teacher",
        "artist",
        "cook",
        "friend",
        "doctor",
        "dancer",
        "farmer",
      ],
      medium: [
        "inventor",
        "gardener",
        "astronaut",
        "baker",
        "detective",
        "musician",
        "cartographer",
        "pilot",
      ],
      hard: [
        "time traveler",
        "royal astronomer",
        "retired villain",
        "dream collector",
        "deep sea explorer",
        "shadow puppeteer",
        "memory keeper",
        "wandering alchemist",
      ],
    },
  },
  {
    id: "mood",
    words: {
      easy: [
        "happy",
        "calm",
        "silly",
        "sad",
        "excited",
        "sleepy",
        "friendly",
        "scary",
      ],
      medium: [
        "peaceful",
        "mysterious",
        "playful",
        "lonely",
        "festive",
        "tense",
        "dreamy",
        "hopeful",
      ],
      hard: [
        "bittersweet",
        "uncanny",
        "nostalgic",
        "euphoric",
        "foreboding",
        "surreal",
        "wistful",
        "triumphant",
      ],
    },
  },
];

let difficulty = "easy";
const recentWordsByCategory = new Map();

const grid = document.querySelector("#wordGrid");
const statusLine = document.querySelector("#statusLine");
const modeLine = document.querySelector("#modeLine");
const generateButton = document.querySelector("#generateWords");
const resetButton = document.querySelector("#resetCards");
const difficultyDropdown = document.querySelector("#difficultyDropdown");
const difficultyButton = document.querySelector("#difficultyButton");
const difficultyValue = document.querySelector("#difficultyValue");
const difficultyOptions = document.querySelectorAll(".difficulty-option");
const bulkActionsDropdown = document.querySelector("#bulkActionsDropdown");
const bulkActionsButton = document.querySelector("#bulkActionsButton");
const bulkOptions = document.querySelectorAll(".bulk-option");
const settingsDialog = document.querySelector("#settingsDialog");
const openSettingsButton = document.querySelector("#openSettings");
const closeSettingsButton = document.querySelector("#closeSettings");
const saveSettingsButton = document.querySelector("#saveSettings");
const clearSettingsButton = document.querySelector("#clearSettings");
const apiKeyInput = document.querySelector("#apiKeyInput");
const apiKeyStatus = document.querySelector("#apiKeyStatus");
const modelInput = document.querySelector("#modelInput");
const directionInput = document.querySelector("#directionInput");
const settingsConfirmation = document.querySelector("#settingsConfirmation");

try {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
} catch {
  // The current app stores settings through the local server, not browser storage.
}

function getCategoryLabel(categoryId) {
  const card = grid.querySelector(`[data-id="${categoryId}"]`);
  return (
    card?.querySelector(".category-title")?.textContent.trim() || categoryId
  );
}

function cleanCategoryLabel(label) {
  return label
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGeneratedKey(key) {
  return cleanCategoryLabel(String(key)).toLowerCase();
}

function createStateItem(category, word = "Ready") {
  return {
    ...category,
    label: getCategoryLabel(category.id),
    word,
    locked: false,
    enabled: true,
  };
}

let state = categories.map((category) => createStateItem(category));

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function getSettings() {
  const fallback = {
    hasApiKey: false,
    model: DEFAULT_MODEL,
    direction: "",
    settingsPath: "",
  };

  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (!response.ok) return fallback;
    const savedSettings = await response.json();
    if (savedSettings.model === "gpt-5-mini")
      savedSettings.model = DEFAULT_MODEL;
    return { ...fallback, ...savedSettings };
  } catch {
    return fallback;
  }
}

async function saveSettings(settings) {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save settings.");
  return data;
}

async function clearSettings() {
  const response = await fetch("/api/settings", {
    method: "DELETE",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not clear settings.");
  return data;
}

function setStatus(message) {
  statusLine.textContent = message;
}

function setSettingsConfirmation(message) {
  settingsConfirmation.textContent = message;
  settingsConfirmation.classList.toggle("is-visible", Boolean(message));
}

function setApiKeyStatus(settings) {
  apiKeyStatus.classList.toggle("has-key", settings.hasApiKey);
  apiKeyStatus.classList.toggle("no-key", !settings.hasApiKey);
  apiKeyStatus.textContent = settings.hasApiKey
    ? "OpenAI API key found in UserSettings."
    : "No OpenAI API key found in UserSettings.";
}

function setModeLine(settings) {
  modeLine.classList.toggle("has-key", settings.hasApiKey);
  modeLine.classList.toggle("no-key", !settings.hasApiKey);
  modeLine.classList.add("is-ready");
}

async function refreshModeLine() {
  setModeLine(await getSettings());
}

function getWordPool(category) {
  return category.words[difficulty] || category.words.medium;
}

function normalizeWord(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulTerms(value) {
  const normalized = normalizeWord(value);
  const terms = normalized
    .split(" ")
    .map((term) => term.replace(/s$/, ""))
    .filter((term) => term.length > 2 && !WORD_STOPLIST.has(term));

  return new Set([normalized, ...terms].filter(Boolean));
}

function wordsOverlap(firstWord, secondWord) {
  const firstTerms = getMeaningfulTerms(firstWord);
  const secondTerms = getMeaningfulTerms(secondWord);

  for (const term of firstTerms) {
    if (secondTerms.has(term)) return true;
  }

  return false;
}

function rememberRecentWord(categoryId, word) {
  if (!word || word === "Ready") return;

  const recentWords = recentWordsByCategory.get(categoryId) || [];
  recentWords.unshift(word);
  recentWordsByCategory.set(
    categoryId,
    [...new Set(recentWords)].slice(0, RECENT_WORD_LIMIT),
  );
}

function getRecentWords(categoryId) {
  return recentWordsByCategory.get(categoryId) || [];
}

function validateGeneratedWords(generated, targetCategories) {
  const accepted = state
    .filter((category) => category.enabled && category.locked)
    .map((category) => ({ label: category.label, word: category.word }));
  const values = {};
  const conflicts = [];
  const generatedByKey = {};

  Object.entries(generated || {}).forEach(([key, value]) => {
    generatedByKey[normalizeGeneratedKey(key)] = value;
  });

  targetCategories.forEach((category) => {
    const cleanLabel = cleanCategoryLabel(category.label).toLowerCase();
    const value = String(
      generated[category.id] ||
        generatedByKey[category.id] ||
        generated[cleanLabel] ||
        generatedByKey[cleanLabel] ||
        generated[category.label] ||
        "",
    ).trim();
    if (!value) {
      conflicts.push(`${category.label}: empty response`);
      return;
    }

    if (category.word !== "Ready" && wordsOverlap(value, category.word)) {
      conflicts.push(
        `${category.label}: "${value}" repeats current word "${category.word}"`,
      );
      return;
    }

    const recentConflict = getRecentWords(category.id).find((word) =>
      wordsOverlap(value, word),
    );
    if (recentConflict) {
      conflicts.push(
        `${category.label}: "${value}" repeats recent word "${recentConflict}"`,
      );
      return;
    }

    const conflict = accepted.find((item) => wordsOverlap(value, item.word));
    if (conflict) {
      conflicts.push(
        `${category.label}: "${value}" overlaps with ${conflict.label}: "${conflict.word}"`,
      );
      return;
    }

    accepted.push({ label: category.label, word: value });
    values[category.id] = value;
  });

  return { values, conflicts };
}

function fillMissingGeneratedWords(values, targetCategories) {
  const accepted = state
    .filter((category) => category.enabled && category.locked)
    .map((category) => ({ label: category.label, word: category.word }));

  Object.entries(values).forEach(([categoryId, word]) => {
    const category = state.find((item) => item.id === categoryId);
    accepted.push({ label: category?.label || categoryId, word });
  });

  targetCategories.forEach((category) => {
    if (values[category.id]) return;

    const wordPool = getWordPool(category);
    let fallbackWord = randomItem(wordPool);
    let guard = 0;

    while (
      accepted.some((item) => wordsOverlap(fallbackWord, item.word)) &&
      guard < 30
    ) {
      fallbackWord = randomItem(wordPool);
      guard += 1;
    }

    values[category.id] = fallbackWord;
    accepted.push({ label: category.label, word: fallbackWord });
  });

  return values;
}

function renderCards() {
  state.forEach((category) => {
    const card = grid.querySelector(`[data-id="${category.id}"]`);
    if (!card) return;

    const word = card.querySelector(".word");
    const enableToggle = card.querySelector(".enable-toggle");
    const toggleLabel = card.querySelector(".toggle-label");
    const lockButton = card.querySelector(".lock-toggle");
    const rerollButton = card.querySelector(".reroll-card");
    const lockLabel = category.locked ? "Unlock word" : "Lock word";

    card.classList.toggle("is-locked", category.locked);
    card.classList.toggle("is-disabled", !category.enabled);
    word.textContent = category.word;
    enableToggle.checked = category.enabled;
    toggleLabel.textContent = category.enabled ? "Enabled" : "Disabled";
    lockButton.disabled = !category.enabled;
    lockButton.title = lockLabel;
    lockButton.setAttribute("aria-label", lockLabel);
    lockButton.innerHTML = category.locked ? ICONS.lockClosed : ICONS.lockOpen;
    rerollButton.disabled = !category.enabled || category.locked;
    rerollButton.title = rerollButton.disabled
      ? "Unlock and enable this card to reroll"
      : "Reroll this card";
    rerollButton.setAttribute("aria-label", rerollButton.title);
    rerollButton.innerHTML = ICONS.reroll;
  });
}

function animateCard(id) {
  const card = grid.querySelector(`[data-id="${id}"]`);
  if (!card) return;
  card.classList.remove("is-rolling");
  requestAnimationFrame(() => {
    card.classList.add("is-rolling");
    window.setTimeout(() => card.classList.remove("is-rolling"), 420);
  });
}

function rerollCategory(categoryId, force = false) {
  const category = state.find((item) => item.id === categoryId);
  if (!category || !category.enabled || (category.locked && !force))
    return false;

  const wordPool = getWordPool(category);
  let nextWord = randomItem(wordPool);
  if (wordPool.length > 1) {
    const activeWords = state
      .filter((item) => item.enabled && item.id !== category.id)
      .map((item) => item.word);
    let guard = 0;
    while (
      (nextWord === category.word ||
        activeWords.some((word) => wordsOverlap(nextWord, word))) &&
      guard < 30
    ) {
      nextWord = randomItem(wordPool);
      guard += 1;
    }
  }
  category.word = nextWord;
  rememberRecentWord(category.id, nextWord);
  return true;
}

function generateUnlockedWords() {
  const changedIds = [];

  state.forEach((category) => {
    if (rerollCategory(category.id)) changedIds.push(category.id);
  });

  renderCards();
  changedIds.forEach(animateCard);
  setStatus(
    changedIds.length
      ? "New drawing prompt generated."
      : "Everything active is locked or disabled.",
  );
}

async function generateWords() {
  const settings = await getSettings();

  if (settings.hasApiKey) {
    generateWithLlm();
    return;
  }

  generateUnlockedWords();
}

function resetCards() {
  recentWordsByCategory.clear();
  state = categories.map((category) => createStateItem(category));
  renderCards();
  setStatus("Cards reset to ready state.");
}

function enableAllCards() {
  state.forEach((category) => {
    category.enabled = true;
  });
  renderCards();
  setStatus("All cards enabled.");
}

function disableAllCards() {
  state.forEach((category) => {
    category.enabled = false;
  });
  renderCards();
  setStatus("All cards disabled.");
}

function lockAllCards() {
  state.forEach((category) => {
    category.locked = true;
  });
  renderCards();
  setStatus("All cards locked.");
}

function unlockAllCards() {
  state.forEach((category) => {
    category.locked = false;
  });
  renderCards();
  setStatus("All cards unlocked.");
}

function closeBulkActions() {
  bulkActionsDropdown.classList.remove("is-open");
  bulkActionsButton.setAttribute("aria-expanded", "false");
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in the model response.");
  return JSON.parse(match[0]);
}

async function generateWithLlm(targetCategoriesOverride = null) {
  const settings = await getSettings();
  const targetCategories =
    targetCategoriesOverride ||
    state.filter((category) => category.enabled && !category.locked);

  if (!settings.hasApiKey) {
    setStatus("Add your OpenAI API key in settings first.");
    settingsDialog.showModal();
    return;
  }

  if (!targetCategories.length) {
    setStatus("Everything active is locked or disabled.");
    return;
  }

  generateButton.disabled = true;
  setStatus(
    targetCategoriesOverride
      ? "Asking the LLM to reroll this card..."
      : "Asking the LLM for drawing words...",
  );

  const categoryList = targetCategories
    .map((category) => `${category.id} (${cleanCategoryLabel(category.label)})`)
    .join(", ");
  const targetKeys = targetCategories.map((category) => category.id);
  const lockedWords =
    state
      .filter((category) => category.enabled && category.locked)
      .map((category) => `${category.label}: ${category.word}`)
      .join("; ") || "none";
  const recentWords =
    targetCategories
      .map((category) => {
        const wordsToAvoid = [
          category.word,
          ...getRecentWords(category.id),
        ].filter((word) => word && word !== "Ready");
        return wordsToAvoid.length
          ? `${category.label}: ${wordsToAvoid.join(", ")}`
          : "";
      })
      .filter(Boolean)
      .join("; ") || "none";
  const rejectedPhrases = [];

  try {
    let generatedValues = null;
    let lastConflicts = [];
    let lastValues = {};

    for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt += 1) {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryList,
          targetKeys,
          difficulty,
          lockedWords,
          recentWords,
          rejectedPhrases,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The API request failed.");
      }

      const generated = extractJson(data.outputText || "");
      const result = validateGeneratedWords(generated, targetCategories);

      if (!result.conflicts.length) {
        generatedValues = result.values;
        break;
      }

      lastValues = result.values;
      lastConflicts = result.conflicts;
      rejectedPhrases.push(
        ...Object.values(generated)
          .map((value) => String(value).trim())
          .filter(Boolean),
      );
      setStatus(
        `LLM repeated an idea, retrying (${attempt}/${MAX_LLM_ATTEMPTS})...`,
      );
    }

    if (!generatedValues) {
      const missingOnly = lastConflicts.every((conflict) =>
        conflict.includes("empty response"),
      );

      if (missingOnly) {
        generatedValues = fillMissingGeneratedWords(
          lastValues,
          targetCategories,
        );
        setStatus(
          "The LLM missed a category, so built-in words filled the gap.",
        );
      } else {
        throw new Error(
          `The LLM kept returning repeated ideas. ${lastConflicts[0] || "Try generating again."}`,
        );
      }
    }

    const changedIds = [];

    state = state.map((category) => {
      const value = generatedValues[category.id];
      if (!category.enabled || category.locked || !value) return category;
      changedIds.push(category.id);
      rememberRecentWord(category.id, value);
      return { ...category, word: String(value).trim() };
    });

    renderCards();
    changedIds.forEach(animateCard);
    setStatus(
      targetCategoriesOverride
        ? `${targetCategories[0].label} rerolled with LLM.`
        : "LLM prompt generated.",
    );
  } catch (error) {
    setStatus(error.message || "Could not generate with the LLM.");
  } finally {
    generateButton.disabled = false;
  }
}

async function rerollSingleCard(category) {
  const settings = await getSettings();

  if (settings.hasApiKey) {
    await generateWithLlm([category]);
    return;
  }

  if (rerollCategory(category.id, true)) {
    renderCards();
    animateCard(category.id);
    setStatus(`${category.label} rerolled.`);
  }
}

async function loadSettingsIntoForm() {
  const settings = await getSettings();
  apiKeyInput.value = "";
  apiKeyInput.placeholder = settings.hasApiKey ? "Saved!" : "sk-...";
  setApiKeyStatus(settings);
  modelInput.value = settings.model;
  directionInput.value = settings.direction;
  setSettingsConfirmation(
    settings.hasApiKey
      ? `API key saved. Location: ${settings.settingsPath}`
      : `No API key saved yet. It will be stored at: ${settings.settingsPath || "%localappdata%\\Words2DrawGenerator\\UserSettings\\settings.json"}`,
  );
}

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".word-card");
  if (!card) return;
  const category = state.find((item) => item.id === card.dataset.id);
  if (!category) return;

  if (!category.enabled) {
    setStatus(
      `${category.label} is disabled. Enable it before using card controls.`,
    );
    return;
  }

  if (event.target.closest(".lock-toggle")) {
    category.locked = !category.locked;
    renderCards();
    setStatus(
      category.locked
        ? `${category.label} locked.`
        : `${category.label} unlocked.`,
    );
  }

  if (event.target.closest(".reroll-card")) {
    rerollSingleCard(category);
  }
});

grid.addEventListener("change", (event) => {
  if (!event.target.matches(".enable-toggle")) return;
  const card = event.target.closest(".word-card");
  const category = state.find((item) => item.id === card.dataset.id);
  if (!category) return;

  category.enabled = event.target.checked;
  renderCards();
  setStatus(
    category.enabled
      ? `${category.label} enabled.`
      : `${category.label} disabled.`,
  );
});

generateButton.addEventListener("click", generateWords);
resetButton.addEventListener("click", resetCards);

difficultyButton.addEventListener("click", () => {
  const isOpen = difficultyDropdown.classList.toggle("is-open");
  difficultyButton.setAttribute("aria-expanded", String(isOpen));
});

difficultyOptions.forEach((option) => {
  option.addEventListener("click", () => {
    difficulty = option.dataset.difficulty;
    difficultyValue.textContent = option.textContent;

    difficultyOptions.forEach((item) => {
      const isSelected = item === option;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-selected", String(isSelected));
    });

    difficultyDropdown.classList.remove("is-open");
    difficultyButton.setAttribute("aria-expanded", "false");
    setStatus(
      `Difficulty set to ${difficulty}. Locked words will stay unchanged.`,
    );
  });
});

bulkActionsButton.addEventListener("click", () => {
  const isOpen = bulkActionsDropdown.classList.toggle("is-open");
  bulkActionsButton.setAttribute("aria-expanded", String(isOpen));
});

bulkOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const actions = {
      "enable-all": enableAllCards,
      "disable-all": disableAllCards,
      "lock-all": lockAllCards,
      "unlock-all": unlockAllCards,
    };
    actions[option.dataset.action]?.();
    closeBulkActions();
  });
});

document.addEventListener("click", (event) => {
  if (
    difficultyDropdown.contains(event.target) ||
    bulkActionsDropdown.contains(event.target)
  )
    return;
  difficultyDropdown.classList.remove("is-open");
  difficultyButton.setAttribute("aria-expanded", "false");
  closeBulkActions();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  difficultyDropdown.classList.remove("is-open");
  difficultyButton.setAttribute("aria-expanded", "false");
  closeBulkActions();
});

openSettingsButton.addEventListener("click", async () => {
  await loadSettingsIntoForm();
  settingsDialog.showModal();
});

closeSettingsButton.addEventListener("click", () => settingsDialog.close());

saveSettingsButton.addEventListener("click", async () => {
  try {
    const submittedApiKey = apiKeyInput.value.trim();
    const settings = await saveSettings({
      apiKey: submittedApiKey,
      model: modelInput.value.trim() || DEFAULT_MODEL,
      direction: directionInput.value.trim(),
    });

    apiKeyInput.value = "";
    apiKeyInput.placeholder = settings.hasApiKey
      ? "Saved in UserSettings"
      : "sk-...";
    setApiKeyStatus(settings);
    setModeLine(settings);

    if (settings.apiKeyAction === "saved") {
      setSettingsConfirmation(
        `API key saved. Location: ${settings.settingsPath}`,
      );
      setStatus("Settings saved in AppData.");
    } else {
      setSettingsConfirmation(
        `Settings updated. Existing API key kept in: ${settings.settingsPath}`,
      );
      setStatus(
        submittedApiKey
          ? "Settings saved in AppData."
          : "Settings updated. Existing API key kept.",
      );
    }
  } catch (error) {
    setSettingsConfirmation("");
    setStatus(error.message || "Could not save settings.");
  }
});

clearSettingsButton.addEventListener("click", async () => {
  try {
    await clearSettings();
    await loadSettingsIntoForm();
    await refreshModeLine();
    setSettingsConfirmation("Settings cleared from AppData.");
    setStatus("Settings cleared from AppData.");
  } catch (error) {
    setStatus(error.message || "Could not clear settings.");
  }
});

renderCards();
refreshModeLine();

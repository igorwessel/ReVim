const Command = {
  countBuffer: "",
  countTimeout: null,
  _boundHandleKeydown: null,
  keymaps: {
    j: (count) => {
      ReVim.moveDown(count);
    },
    k: (count) => {
      ReVim.moveUp(count);
    },
    g: () => {
      ReVim.goToTop();
    },
    G: () => {
      ReVim.goToBottom();
    },
    n: () => {
      ReVim.nextUnviewedDiff();
    },
    N: () => {
      ReVim.prevUnviewedDiff();
    },
    v: () => {
      ReVim.markAsViewed();
      ReVim.nextUnviewedDiff();
    },
    V: () => {
      ReVim.markAsViewed();
    },
    r: () => {
      ReVim.loadDiffs();
    },
  },
  handleKeydown(e) {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.contentEditable === "true"
    ) {
      return;
    }

    if (e.key >= "0" && e.key <= "9") {
      if (this.countBuffer === "" && e.key === "0") return;

      this.countBuffer += e.key;
      this.countTimeout = setTimeout(() => (this.countBuffer = ""), 1000);
      e.preventDefault();
      return;
    }

    const command = this.keymaps[e.key];

    if (!command) return;

    ReVim.logger.debug(`Executing command for key "${e.key}"`);
    const count = parseInt(this.countBuffer) || 1;
    this.countBuffer = "";
    command(count);
    clearTimeout(this.countTimeout);
    this.countTimeout = null;
    e.preventDefault();
  },
  init() {
    this._boundHandleKeydown = this.handleKeydown.bind(this);
    document.addEventListener("keydown", this._boundHandleKeydown);
  },
  remove() {
    if (!this._boundHandleKeydown) return;

    clearTimeout(this.countTimeout);
    this.countTimeout = null;
    this.countBuffer = "";
    document.removeEventListener("keydown", this._boundHandleKeydown);
    this._boundHandleKeydown = null;
  },
};

const ReVim = {
  diffs: [],
  currentIndex: -1,
  initialized: false,
  lastInitializedPath: null,
  isClassicDiff: false,
  logger: {
    debug: (message) => {
      console.debug(`[Revim] `, message);
    },
    info: (message) => {
      console.info(`[Revim] `, message);
    },
    warn: (message) => {
      console.warn(`[Revim] `, message);
    },
    error: (message) => {
      console.error(`[Revim] `, message);
    },
  },
  isPRFiles() {
    return /pull\/\d+\/files/.test(location.pathname);
  },

  async init() {
    if (this.initialized) {
      this.logger.debug("Skipping initialization, already initialized");
      return;
    }

    this.logger.debug("Initializing Revim");

    Command.init();
    this.loadDiffs();
    this.initialized = true;

    this.logger.debug(`ReVim loaded - ${this.diffs.length} diffs found`);
  },

  loadDiffs() {
    let appDataJson = document.querySelector(
      '[data-target="react-app.embeddedData"]'
    )?.innerHTML;

    try {
      appData = JSON.parse(appDataJson);
    } catch {
      this.isClassicDiff = true;
      const diffs = document.querySelectorAll(".file");

      if (diffs.length > 0) {
        appData = {
          payload: {
            diffSummaries: Array.from(diffs).map((diff) => ({
              pathDigest: diff.id,
              markedAsViewed: false,
            })),
          },
        };
      }
    }

    if (!appData) {
      this.logger.debug("No app data found, skipping diffs");
      return;
    }

    const payload = appData.payload;
    const diffs = payload.diffSummaries;
    this.diffs = diffs;

    this.currentIndex = this.diffs.findIndex((diff) => !diff.markedAsViewed);

    if (this.currentIndex === -1 && this.diffs.length > 0) {
      this.currentIndex = 0;
    }
  },

  getViewedButton(diffElement) {
    if (this.isClassicDiff) {
      return diffElement.querySelector("input[name='viewed']");
    }

    return diffElement.querySelector("button[aria-pressed]");
  },

  getDiffElement(diff) {
    if (this.isClassicDiff) {
      return document.querySelector(`.file[id="${diff.pathDigest}"]`);
    }

    return document.getElementById(`diff-${diff.pathDigest}`);
  },

  getDiffStatus(diffElement) {
    const btn = this.getViewedButton(diffElement);

    if (!btn) return String(false);

    if (this.isClassicDiff) {
      return String(btn.checked);
    }

    return btn.getAttribute("aria-pressed");
  },

  isUnviewed(diff) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return false;

    return this.getDiffStatus(diffElement) === "false";
  },

  isViewed(diff) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return false;

    return this.getDiffStatus(diffElement) === "true";
  },

  moveTo(index) {
    if (index < 0 || index >= this.diffs.length) return;

    const diffElement = this.getDiffElement(this.diffs[index]);

    this.logger.debug(diffElement);
    this.logger.debug(this.diffs[index]);

    if (!diffElement) return;

    if (this.isClassicDiff) {
      this.currentIndex = index;
      location.replace(`#${this.diffs[index].pathDigest}`);
      return;
    }

    if (this.currentIndex >= 0 && this.diffs[this.currentIndex]) {
      const currentDiff = this.getDiffElement(this.diffs[this.currentIndex]);

      if (currentDiff) {
        currentDiff.dataset.targeted = "false";
      }
    }

    this.currentIndex = index;

    diffElement.dataset.targeted = "true";
    diffElement.scrollIntoView({ behavior: "smooth" });

    this.logger.debug(`Moved to diff ${index}`);
    this.logger.debug(diffElement);
  },

  moveDown(count = 1) {
    const newIndex = Math.min(this.currentIndex + count, this.diffs.length - 1);
    this.moveTo(newIndex);
  },

  moveUp(count = 1) {
    const newIndex = Math.max(this.currentIndex - count, 0);
    this.moveTo(newIndex);
  },

  nextUnviewedDiff() {
    for (let i = this.currentIndex + 1; i < this.diffs.length; i++) {
      const isUnviewed = this.isUnviewed(this.diffs[i]);

      if (!isUnviewed) continue;

      this.moveTo(i);
      return;
    }

    this.logger.debug("No more unviewed diffs");
  },

  prevUnviewedDiff() {
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      const isUnviewed = this.isUnviewed(this.diffs[i]);

      if (!isUnviewed) continue;

      this.moveTo(i);
      return;
    }

    this.logger.debug("No more unviewed diffs");
  },

  markAsViewed() {
    const diff = this.diffs[this.currentIndex];
    const diffElement = this.getDiffElement(diff);

    const btn = this.getViewedButton(diffElement);
    if (btn) {
      btn.click();
    }
  },

  goToTop() {
    this.moveTo(0);
  },

  goToBottom() {
    this.moveTo(this.diffs.length - 1);
  },
};

async function safeInit() {
  const currentPath = location.pathname;

  if (!ReVim.isPRFiles()) {
    ReVim.logger.debug("Not a PR Files page, skipping init");
    ReVim.initialized = false;
    Command.remove();
    return;
  }

  if (ReVim.lastInitializedPath === currentPath && ReVim.initialized) {
    ReVim.logger.debug("Already initialized for this path, reloading diffs");
    ReVim.loadDiffs();
    return;
  }

  ReVim.lastInitializedPath = currentPath;
  ReVim.init();
}

["turbo:render", "turbo:load", "pjax:end", "soft-nav:end"].forEach((evt) => {
  document.addEventListener(evt, () => {
    ReVim.logger.debug(`Navigation event detected: ${evt}`);
    safeInit();
  });
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", safeInit);
} else {
  safeInit();
}

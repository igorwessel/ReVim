const ReVim = {
  diffs: [],
  currentIndex: -1,
  motionCount: 0,
  activeClass: "revim-active-diff",
  initialized: false,
  lastInitializedPath: null,
  diffSelector: '[id^="diff-"][role="region"]:not([aria-label*="Loading"])',
  keydownListener: null,

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
      this.logger.debug("Already initialized, reloading diffs");
      return;
    }
    this.logger.debug("Initializing Revim");

    this.injectStyles();
    this.loadDiffs();
    this.setupKeybindings();
    this.initialized = true;

    this.logger.debug(`ReVim loaded - ${this.diffs.length} diffs found`);
  },

  injectStyles() {
    if (document.getElementById("revim-styles")) return;

    const style = document.createElement("style");
    style.id = "revim-styles";
    style.textContent = `
      .${this.activeClass} *:not(button, tr, td, div[class*="DiffSquares"]) {
        border-color: var(--borderColor-accent-emphasis) !important;
      }
    `;

    document.head.appendChild(style);
  },

  loadDiffs() {
    const appData = JSON.parse(
      document.querySelector('[data-target="react-app.embeddedData"]').innerHTML
    );
    const payload = appData.payload;
    const diffs = payload.diffSummaries;

    // const diffHeaders = document.querySelectorAll(this.diffSelector);
    // this.diffs = Array.from(diffHeaders);

    this.diffs = diffs;

    this.currentIndex = this.diffs.findIndex((diff) => diff.markedAsViewed);

    if (this.currentIndex === -1 && this.diffs.length > 0) {
      this.currentIndex = 0;
    }
  },

  getViewedButton(diffElement) {
    return diffElement.querySelector("button[aria-pressed]");
  },

  getDiffElement(diff) {
    return document.getElementById(`diff-${diff.pathDigest}`);
  },

  getDiffStatus(diffElement) {
    const btn = this.getViewedButton(diffElement);

    return btn && btn.getAttribute("aria-pressed");
  },

  isUnviewed(diff) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return;

    return this.getDiffStatus(diffElement) === "false";
  },

  isViewed(diff) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return;

    return this.getDiffStatus(diffElement) === "true";
  },

  moveTo(index) {
    if (index < 0 || index >= this.diffs.length) return;

    const diffElement = this.getDiffElement(this.diffs[index]);

    ReVim.logger.debug(diffElement);
    ReVim.logger.debug(this.diffs[index]);

    if (!diffElement) return;

    if (this.currentIndex >= 0 && this.diffs[this.currentIndex]) {
      const currentDiff = this.getDiffElement(this.diffs[this.currentIndex]);

      if (currentDiff) {
        currentDiff.classList.remove(this.activeClass);
      }
    }

    this.currentIndex = index;

    diffElement.classList.add(this.activeClass);
    this.logger.debug(`Moved to diff ${index}`);
    this.logger.debug(diffElement);
    // location.replace("#" + getDiff.id);
    this.scrollToElement(diffElement);
    diffElement.focus();
  },

  scrollToElement(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const topOffset = rect.top;
    const bottomOffset = viewportHeight - rect.bottom;

    const minTopMargin = 80; // Space from top (for GitHub header)
    const minBottomMargin = 100; // Space from bottom

    if (
      topOffset < minTopMargin ||
      bottomOffset < minBottomMargin ||
      rect.top < 0 ||
      rect.bottom > viewportHeight
    ) {
      const elementTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const offset = Math.max(
        minTopMargin,
        (viewportHeight - elementHeight) / 3
      );

      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });
    }
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
      const btn = this.isUnviewed(this.diffs[i]);

      if (!btn) continue;

      this.moveTo(i);
      return;
    }

    this.logger.debug("No more unviewed diffs");
  },

  prevUnviewedDiff() {
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      const btn = this.isUnviewed(this.diffs[i]);
      if (!btn) continue;

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

  setupKeybindings() {
    let count = 1;
    let countTimeout = null;

    this.keydownListener = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.contentEditable === "true"
      ) {
        return;
      }

      switch (e.key) {
        case "j":
          this.moveDown(count);
          this.logger.debug(`Moved down ${count} diffs`);
          e.preventDefault();
          break;

        case "k":
          this.moveUp(count);
          this.logger.debug(`Moved up ${count} diffs`);
          e.preventDefault();
          break;

        case "g":
          this.goToTop();
          this.logger.debug(`Moved to top`);
          e.preventDefault();
          break;
        case "G":
          this.goToBottom();
          this.logger.debug(`Moved to bottom`);
          e.preventDefault();
          break;

        case "n":
          this.nextUnviewedDiff();
          this.logger.debug(`Moved to next unviewed diff`);
          e.preventDefault();
          break;

        case "N":
          this.prevUnviewedDiff();
          this.logger.debug(`Moved to previous unviewed diff`);
          e.preventDefault();
          break;

        case "v":
          this.markAsViewed();
          this.nextUnviewedDiff();
          this.logger.debug(`Marked as viewed and moved to next unviewed diff`);
          e.preventDefault();
          break;

        case "V":
          this.markAsViewed();
          this.logger.debug(`Marked as viewed`);
          e.preventDefault();
          break;

        case "r":
          this.loadDiffs();
          this.logger.debug("Reloaded diffs");
          e.preventDefault();
          break;

        default:
          this.lastKey = null;
      }
    };

    document.addEventListener("keydown", this.keydownListener);
  },

  removeKeybindings() {
    if (!this.keydownListener) return;

    document.removeEventListener("keydown", this.keydownListener);
    this.keydownListener = null;
  },
};

async function isReadyForInit() {
  if (!ReVim.isPRFiles()) return false;

  for (let i = 0; i < 20; i++) {
    if (document.querySelector(ReVim.diffSelector)) return true;

    await new Promise((r) => setTimeout(r, 100));
  }

  return false;
}

async function safeInit() {
  const currentPath = location.pathname;

  if (!ReVim.isPRFiles()) {
    ReVim.logger.debug("Not a PR Files page, skipping init");
    ReVim.initialized = false;
    ReVim.removeKeybindings();
    return;
  }

  if (ReVim.lastInitializedPath === currentPath && ReVim.initialized) {
    ReVim.logger.debug("Already initialized for this path, reloading diffs");
    ReVim.loadDiffs();
    return;
  }

  ReVim.logger.debug("Checking if page is ready for init");
  const ready = await isReadyForInit();
  if (!ready) {
    ReVim.logger.debug("Page not ready for init");
    return;
  }

  ReVim.lastInitializedPath = currentPath;

  if (ReVim.initialized) {
    ReVim.logger.debug("Already initialized, refreshing diffs");
    ReVim.loadDiffs();
  } else {
    ReVim.logger.debug("Initializing Revim for this PR page");
    ReVim.init();
  }
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

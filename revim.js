const Revim = {
  diffs: [],
  currentIndex: -1,
  motionCount: 0,
  activeClass: "revim-active-diff",

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

  init() {
    this.logger.debug("Initializing Revim");

    this.injectStyles();
    this.loadDiffs();
    this.setupKeybindings();
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
    const diffHeaders = document.querySelectorAll(
      '[id^="diff-"][role="region"]'
    );

    this.diffs = Array.from(diffHeaders);

    this.currentIndex = this.diffs.findIndex((diff) => this.isUnviewed(diff));

    if (this.currentIndex === -1 && this.diffs.length > 0) {
      this.currentIndex = 0;
    }
  },

  getUnviewedDiff() {
    return this.diffs.filter((diff) => this.isUnviewed(diff));
  },

  getViewedButton(diff) {
    return diff.querySelector("button[aria-pressed]");
  },

  getDiffStatus(diff) {
    const btn = this.getViewedButton(diff);
    return btn && btn.getAttribute("aria-pressed");
  },

  isUnviewed(diff) {
    return this.getDiffStatus(diff) === "false";
  },

  isViewed(diff) {
    return this.getDiffStatus(diff) === "true";
  },

  moveTo(index) {
    if (index < 0 || index >= this.diffs.length) return;

    if (this.currentIndex >= 0 && this.diffs[this.currentIndex]) {
      this.diffs[this.currentIndex].classList.remove(this.activeClass);
    }

    this.currentIndex = index;

    const diff = this.diffs[index];
    diff.classList.add(this.activeClass);
    this.logger.debug(`Moved to diff ${index}`);
    this.logger.debug(diff);
    this.scrollToElement(diff);
    diff.focus();
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
    const btn = this.getViewedButton(diff);
    if (btn) {
      btn.click();
    }
  },

  goToTop() {
    moveTo(0);
  },

  goToBottom() {
    moveTo(this.diffs.length - 1);
  },

  setupKeybindings() {
    let countBuffer = "";
    let countTimeout = null;

    document.addEventListener("keydown", (e) => {
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
    });
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    Revim.init();
  });
} else {
  Revim.init();
}

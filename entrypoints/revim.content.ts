type DiffSummary = {
  pathDigest: string;
  markedAsViewed: boolean;
};

const Command = {
  countBuffer: "",
  countTimeout: undefined as NodeJS.Timeout | undefined,
  _boundHandleKeydown: null as
    | ((this: Document, ev: KeyboardEvent) => void)
    | null,
  keymaps: {
    j: (count: number) => {
      ReVim.moveDown(count);
    },
    k: (count: number) => {
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
  handleKeydown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.contentEditable === "true")
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

    const command = this.keymaps[e.key as keyof typeof this.keymaps];

    if (!command) return;

    ReVim.logger.debug(`Executing command for key "${e.key}"`);
    const count = parseInt(this.countBuffer) || 1;
    this.countBuffer = "";
    command(count);
    clearTimeout(this.countTimeout);
    this.countTimeout = undefined;
    e.preventDefault();
  },
  init() {
    this._boundHandleKeydown = this.handleKeydown.bind(this);
    document.addEventListener("keydown", this._boundHandleKeydown);
  },
  remove() {
    if (!this._boundHandleKeydown) return;

    clearTimeout(this.countTimeout);
    this.countTimeout = undefined;
    this.countBuffer = "";
    document.removeEventListener("keydown", this._boundHandleKeydown);
    this._boundHandleKeydown = null;
  },
};

const ReVim = {
  diffs: [] as DiffSummary[],
  currentIndex: -1,
  initialized: false,
  lastInitializedPath: null as string | null,
  isClassicDiff: false,
  logger: {
    debug: (message: unknown) => {
      console.debug(`[Revim]`, message);
    },
    info: (message: unknown) => {
      console.info(`[Revim]`, message);
    },
    warn: (message: unknown) => {
      console.warn(`[Revim]`, message);
    },
    error: (message: unknown) => {
      console.error(`[Revim]`, message);
    },
  },
  isPRFiles() {
    return /pull\/\d+\/files/.test(location.pathname);
  },

  init() {
    if (this.initialized) {
      this.logger.debug("Skipping initialization, already initialized");
      this.loadDiffs();
      return;
    }

    this.logger.debug("Initializing Revim");

    Command.init();
    this.loadDiffs();
    this.initialized = true;

    this.logger.debug(`${this.diffs.length} diffs found`);
  },

  loadDiffs() {
    const appDataJson = document.querySelector(
      '[data-target="react-app.embeddedData"]'
    );

    if (!appDataJson) {
      this.isClassicDiff = true;
    }

    let appData: { payload: { diffSummaries: DiffSummary[] } } | undefined;

    if (this.isClassicDiff) {
      const diffs = document.querySelectorAll(".file");

      this.logger.debug(`${diffs.length} classic diffs found`);

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
    } else {
      appData = JSON.parse(appDataJson?.innerHTML || "");
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

  getViewedButton(diffElement: HTMLElement) {
    if (this.isClassicDiff) {
      return diffElement.querySelector<HTMLInputElement>(
        "input[name='viewed']"
      );
    }

    return diffElement.querySelector<HTMLButtonElement>("button[aria-pressed]");
  },

  getDiffElement(diff: DiffSummary) {
    if (this.isClassicDiff) {
      return document.querySelector<HTMLDivElement>(
        `.file[id="${diff.pathDigest}"]`
      );
    }

    return document.getElementById(`diff-${diff.pathDigest}`);
  },

  getDiffStatus(diffElement: HTMLElement) {
    const btn = this.getViewedButton(diffElement);

    if (!btn) return String(false);

    if (this.isClassicDiff) {
      return String((btn as HTMLInputElement).checked);
    }

    return btn.getAttribute("aria-pressed");
  },

  isUnviewed(diff: DiffSummary) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return;

    return this.getDiffStatus(diffElement) === "false";
  },

  isViewed(diff: DiffSummary) {
    const diffElement = this.getDiffElement(diff);

    if (!diffElement) return;

    return this.getDiffStatus(diffElement) === "true";
  },

  moveTo(index: number) {
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

    if (!diffElement) return;

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

export default defineContentScript({
  matches: ["*://github.com/*"],
  main(ctx) {
    if (document.readyState !== "loading") {
      safeInit(location.pathname);
    }

    ["turbo:render", "turbo:load", "pjax:end", "soft-nav:end"].forEach(
      (evt) => {
        ctx.addEventListener(document, evt, () => {
          ReVim.logger.debug(`Navigation event detected: ${evt}`);
          safeInit(location.pathname);
        });
      }
    );
  },
});

function safeInit(currentPath: string) {
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

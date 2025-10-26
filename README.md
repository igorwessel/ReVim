# ReVim 🚀

> Review PRs like a vim god

Tired of clicking through diffs with your mouse like some peasant? Yeah, me too. That's why I built ReVim—a browser extension that gives you vim keybindings for navigating GitHub PR reviews.

## What does it do?

Basically, it turns GitHub PRs into a vim document. You can now:

- 🏃 Navigate through diffs faster than you can say "modal editing"
- 🎯 Jump straight to unviewed files
- ✅ Mark files as viewed without lifting your hands from the keyboard

## Installation

1. Clone this project
2. Fire up Chrome or Firefox
3. Go to `chrome://extensions` (or equivalent for your browser)
4. Enable "Developer mode"
5. Click "Load unpacked" and select this directory
6. Profit ✨

## Keybindings

The keybindings are pretty intuitive if you've ever touched vim:

| Key | What it does                                   |
| --- | ---------------------------------------------- |
| `j` | Move down to next diff                         |
| `k` | Move up to previous diff                       |
| `g` | Go to the first diff (top of PR)               |
| `G` | Go to the last diff (bottom of PR)             |
| `n` | Jump to next unviewed diff                     |
| `N` | Jump to previous unviewed diff                 |
| `v` | Mark current as viewed + jump to next unviewed |
| `V` | Mark current as viewed (stay where you are)    |
| `r` | Reload diff data                               |

Bonus: You can also use counts! Type `3j` to jump down 3 diffs, `10n` to jump 10 unviewed diffs ahead. You know, vim things.

## Where does it work?

Only on GitHub PR files pages. You know, the ones with the URL pattern `/pull/123/files`. It's smart enough to not interfere with your regular GitHub browsing, so don't worry about it breaking stuff.

## Wait, will it work with my custom keybindings extension?

Probably not. Most vim extensions (like Vimium, Vim Vixen, etc.) will try to hijack these keys too. Disable them for GitHub if you want this to work. Worth it though—trust me.

## License

MIT—do whatever you want with it.

---

**Enjoy your newfound productivity** 🎉

_P.S. if you find bugs or have suggestions, PRs welcome (you can use ReVim to review them faster 😉)_

# Values conversations

Two guided conversations for a couple, done together on one shared phone, tablet or laptop. Neither gives a compatibility score.

- **Values Deck** (`values-deck/`): each person privately sorts 37 value cards (wording from the public-domain Personal Values Card Sort, Miller et al. 2001), ranks a top 7 and rates 13 life areas. You then compare them together in six turn-taking rounds and finish with a joint summary.
- **Enough of Both** (`enough-of-both/`): a structured conversation about security and novelty. Each person rates 37 situation cards and writes privately, then you take speaker and listener turns, name your pattern, map what is core and what is flexible, and agree one to three small experiments with a review date. It can show Values Deck results as context: load a saved Values Deck file in Set up.

## One device, or one each

Both apps work on one shared device passed back and forth. The private part can also be done at the same time on a device each:

1. Each person opens the page, chooses **Start**, sets up with the same two names, then chooses **Use two devices** and picks who is answering on that device.
2. Each does their private part and locks it.
3. One person chooses **Send or add answers**, copies their locked answers as text (or saves them as a file) and sends them to the other, for example in a message. The other pastes or opens them on the same screen.
4. That device now holds both sets and carries on to the shared part, which you do together on it.

The app does not send anything itself. What you send holds one person's private answers, so send it only to your partner.

## Privacy

- No server, accounts, analytics, cookies or third-party requests. Each page's Content Security Policy blocks all network connections (`connect-src 'none'`), and the PDF library is bundled in `vendor/`.
- Progress is kept in the browser's `localStorage` only while "Save progress" is ticked. **Erase everything** clears it.
- **Save to a file** downloads a `.json` file with both people's answers, including private writing. Keep it somewhere private.
- This repository contains only the apps. Never commit personal answers, save files or reports to it.

## Run locally

Any static file server works, for example `python3 -m http.server 8000`, then open http://localhost:8000.

## Files

- `index.html`, `home.css`, `base.css`, `icon.svg`: landing page and shared styles.
- `values-deck/`, `enough-of-both/`: each app's `index.html`, `style.css`, `data.js` (content), `report.js` (PDF report) and `app.js` (screens and flow). The Values Deck also has `scoring.js`.
- `vendor/jspdf.umd.min.js`: jsPDF 2.5.1 (MIT licence, see `vendor/jspdf-LICENSE.txt`).

## Licence

Code: MIT (see `LICENSE`). Personal Values Card Sort wording: public domain. All other content is original.

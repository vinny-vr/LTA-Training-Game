# LTA Training Minigame — GitHub Pages setup

## Files

- `index.html` — page structure
- `training-minigame.css` — all styling
- `training-minigame.js` — all game logic
- `forum-dohtml.txt` — small DOHTML block to paste into the forum

## Publish with GitHub Pages

1. Create a public GitHub repository.
2. Upload these three web files to the repository root:
   - `index.html`
   - `training-minigame.css`
   - `training-minigame.js`
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. GitHub will provide a Pages URL in this format:

   `https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY/`

7. Open `forum-dohtml.txt` and replace the placeholder URL with that Pages URL.
8. Paste the completed block into a forum post with DOHTML enabled.

## Why the iframe version is recommended

Forum software often strips or blocks `<script>` tags inside posts. An iframe keeps the
JavaScript on GitHub Pages and leaves only a very small embed inside the post.

Do not use `raw.githubusercontent.com` for the iframe or stylesheet URLs. GitHub Pages serves
the files with browser-friendly content types.

# Villa Oceania website (voexuma.com)

A static one-page site with a live availability calendar.

- `site/`: the website itself (`index.html`, `images/`, `fonts/`).
- `netlify/functions/availability.js`: reads the VRBO calendar (main) and the Airbnb calendar on the server, merges the booked dates and returns only those dates, never guest names. The page calls it at `/.netlify/functions/availability`.
- `netlify.toml`: tells Netlify to publish `site/` and to deploy the function.

The website files sit in `site/` so the function code, which holds the private calendar links, is never published as a public file.

## Deploy (GitHub + Netlify, no Terminal)

1. Create a **private** GitHub repository and upload everything in this folder, keeping the folder structure. GitHub's upload page takes up to 100 files at a time, so upload in two batches (for example, the `site/images` files on their own, uploaded from inside the `site/images` folder on GitHub).
2. In Netlify, link the project to that repository (Project configuration > Build & deploy > Link repository).
3. Leave the build command empty and set the publish directory to `site`. Netlify reads `netlify.toml` and deploys the function automatically.

Every change committed to the repository's `main` branch publishes automatically. Don't drag-and-drop deploys into Netlify: they leave out the function, and the calendar falls back to "Live availability is temporarily unavailable".

The Netlify CLI also works from this folder: `netlify deploy --prod`.

After deploying, open `https://<your-site>/.netlify/functions/availability` to check that it returns booked dates.

## Calendar feeds

Both calendar links are built into `availability.js`, so no Netlify setup is needed. To use different links, set these in Netlify under **Project configuration > Environment variables**, then redeploy:

- `VRBO_ICAL_URL`: the VRBO iCal export link.
- `AIRBNB_ICAL_URL`: the Airbnb iCal export link.

If the Airbnb calendar can't be read (for example, if the Airbnb listing is closed), the VRBO dates still show. If the VRBO calendar can't be read, the page still loads: every future date stays selectable and guests see a note that live availability is temporarily unavailable.

## Change the minimum stay

Open `site/index.html`, find this line at the top of the main script (near the end of the file), change the number and redeploy:

```
const MIN_NIGHTS = 5;
```

The "Minimum stay is 5 nights" message updates automatically.

## Preview locally

```
netlify dev
```

This serves the site and the function at http://localhost:8888.

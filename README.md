# Villa Oceania website (voexuma.com)

A static one-page site with a live availability calendar.

- `site/`: the website itself (`index.html`, `images/`, `fonts/`).
- `netlify/functions/availability.js`: reads the VRBO calendar on the server and returns only the booked dates, never guest names. The page calls it at `/.netlify/functions/availability`.
- `netlify.toml`: tells Netlify to publish `site/` and to deploy the function.

## Deploy (Netlify CLI)

Drag-and-drop deploys do **not** include the function, so the calendar would show "Live availability is temporarily unavailable". Use the CLI from this folder:

```
npm install -g netlify-cli
netlify login
netlify link          # first time only: choose the villaoceania site
netlify deploy --prod
```

After deploying, open `https://<your-site>/.netlify/functions/availability` to check that it returns booked dates.

## Calendar feeds (environment variables)

Set these in Netlify under **Site settings > Environment variables** (Site configuration > Environment variables in the newer dashboard), then redeploy:

- `VRBO_ICAL_URL`: the VRBO iCal export link. If it isn't set, the function uses the current VRBO link built into `availability.js`.
- `AIRBNB_ICAL_URL`: optional. When it is set, Airbnb bookings are merged with VRBO.

If a feed can't be read, the page still loads: every future date stays selectable and guests see a note that live availability is temporarily unavailable.

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

This serves the site and the function at http://localhost:8888. `tests/calendar.test.js` runs browser checks against that address (Playwright needs to be installed).

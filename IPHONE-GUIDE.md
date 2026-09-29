# Stash — iPhone Guide

This guide has two parts:

- **[Part 1 — First-time setup](#part-1--first-time-setup-james-does-this-once)** — what James does on his laptop to get Stash running on the phones.
- **[Part 2 — Day-to-day use](#part-2--day-to-day-use)** — for anyone who's already got the app installed and is just using it.

---

# Part 1 — First-time setup (James does this once)

## What you need before starting

| | |
|---|---|
| Laptop with Node.js 20+ | (Windows, Mac, or Linux) |
| The `stash` repo cloned locally | `D:\Code\personal\stash` |
| Both phones | iPhones, iOS 17+ |
| **Tailscale** installed on both phones | (You already have this) |

## Step 1 — Install Expo Go on each phone

On both your iPhone and Savanah's iPhone:

1. Open the **App Store**.
2. Search for **Expo Go**.
3. Tap **Get** to install. Free, no account needed.

## Step 2 — Start the dev server on your laptop

Open a terminal on your laptop:

```bash
cd D:\Code\personal\stash\packages\mobile
npx expo start --tunnel
```

What `--tunnel` does: makes the Expo bundle reachable from anywhere on the
internet via Expo's free tunnel service. The phones don't have to be on
your home WiFi to load the bundle.

Wait ~30 seconds. Eventually you'll see something like:

```
› Metro waiting on exp+stash://expo-development-client/?url=https%3A%2F%2F...
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

Plus a big **QR code** in the terminal.

> **Don't close that terminal.** As long as it's running, the phones can
> open Stash. If you close it, the phones can't load the bundle until
> you start it again. (Upgrade path to fix this is in [Step 6](#step-6--optional-eas-update-so-your-laptop-doesnt-have-to-be-on).)

## Step 3 — Scan the QR code with each phone

On each iPhone:

1. Open the iPhone's built-in **Camera** app.
2. Point it at the QR code in your laptop's terminal.
3. A banner appears at the top of the camera saying "Open in Expo Go".
4. Tap the banner. Expo Go launches and starts downloading the Stash
   bundle. First load takes ~10–30 seconds.
5. Stash opens to its login screen.

If the Camera app doesn't show the banner: open Expo Go directly, tap
**Scan QR code**, then point at your laptop's terminal.

## Step 4 — Set the API server URL in the app

When Stash opens for the first time, it doesn't know how to reach the
backend. Tell it:

1. In the app, tap the **Settings** tab (gear icon, bottom right).
2. Find the **Server URL** field.
3. Paste one of these URLs:

   | Where you are | URL to paste |
   |---|---|
   | Anywhere (public HTTPS proxy) | `https://stash-api.shottsserver.com` |
   | Anywhere with Tailscale on | `http://100.122.58.114:3001` |
   | At home (on your WiFi network) | `http://192.168.1.153:3001` |

   **Recommended:** use `https://stash-api.shottsserver.com`. It's live
   (since v1.2.2), uses HTTPS, and works at home or on the road without
   needing Tailscale switched on.

4. Tap **Save**.

## Step 5 — Log in

| Email | Password |
|---|---|
| `jameshendershott85@gmail.com` | the initial password set via `SEED_ADMIN_PASSWORD` when the database was seeded |
| `mama.shotts@gmail.com` | the initial password set via `SEED_USER_PASSWORD` |

> ⚠️ **Change both passwords on first login** by going to the admin
> dashboard at https://stash.shottsserver.com → Users → Reset Password for
> each account. The mobile app currently doesn't have a change-password
> screen.

After login, you'll see the bottom tab bar: Items / Scan / Settings.
Skip ahead to [Part 2](#part-2--day-to-day-use) for what each tab does.

## Step 6 — (Optional) EAS Update so your laptop doesn't have to be on

The setup above works, but it requires `npx expo start --tunnel` to be
running on your laptop whenever the phones load Stash. For a permanent
"app on the home screen" feel, publish the bundle to Expo's free CDN.

1. **Install the CLI** (one-time, on your laptop):
   ```bash
   npm install -g eas-cli
   ```
2. **Sign up for a free Expo account** at https://expo.dev/signup. Then
   on your laptop:
   ```bash
   eas login
   ```
3. **Configure the project** (one-time, in the mobile package):
   ```bash
   cd D:\Code\personal\stash\packages\mobile
   eas init
   ```
4. **Publish the bundle:**
   ```bash
   eas update --branch production
   ```
   This uploads the JS bundle to Expo's CDN. Free tier allows 1,000
   updates/month with unlimited bandwidth. More than enough.
5. **Get the channel URL** that EAS prints — looks like
   `exp://u.expo.dev/<project-id>?channel-name=production`. Generate a
   QR code for it (any free QR generator).
6. Each phone: open Expo Go, scan that QR, the bundle loads from the CDN.
   **No laptop required from this point on.**
7. To push code changes later: rerun `eas update --branch production` on
   your laptop. The phones get the new code on next app open.

This is free, permanent, and the phones treat Stash like a real app.

---

# Part 2 — Day-to-day use

## Signing in

When the app opens, you'll see the **Sign In** screen.

1. **Email** — your account email.
2. **Password** — your password.
3. Tap **Sign In**.

If sign-in fails:
- Check that you're connected to WiFi or Tailscale.
- Double-check your email and password.
- The Tailscale toggle on your phone needs to be **green/on** if you're
  not at home.

## The main screens

After signing in, three tabs at the bottom:

| Tab | Icon | What it does |
|-----|------|--------------|
| **Items** | Box | Browse, search, add, edit |
| **Scan** | Camera | Scan QR codes on boxes/items |
| **Settings** | Gear | Account info + server URL |

## Items tab

The items list shows everything in your Stash database as cards. With
your library, that's currently **697 items**: 432 books, 14 toted
non-book items, plus the items still in the original Eagle Mountain
rooms.

**Search:** tap the search bar at the top, type any word. Results
filter as you type — try `mixer`, `desk`, `Atwood`.

**Filter by fate:** the buttons under the search bar filter by
KEEP / SELL / DONATE / TRASH / UNDECIDED. Tap **All** to clear.

**Pull to refresh:** scroll to the top, pull down, release. Pulls the
latest data from the server.

## Viewing an item

Tap any card. You'll see:

- **Photo** (if one has been uploaded)
- **Name and fate**
- **Fate buttons** — tap any to change the fate; saves instantly
- **Details** — category, condition, room, dimensions, weight
- **Container placements** — which box/tote this item is in

## Taking a photo

1. Open an item by tapping its card.
2. Tap **Take Photo**.
3. Camera opens. Point at item, tap shutter, tap **Use Photo**.
4. Uploads to the server automatically.

Or **Choose Photo** to pick one from your camera roll.

## Adding a new item

1. On Items tab, tap the blue **+** (bottom right).
2. Fill in:
   - **Name** (required) — e.g., "Standing Desk"
   - **Description** (optional)
   - **Category** — pick from the list
   - **Condition** — Good / Fair / Poor
   - **Fate** — Keep / Sell / Donate / Trash / Undecided
   - **Origin Room** — where the item is right now
   - **Quantity** — usually 1
3. Tap **Create Item**.
4. You land on the item's detail page; add a photo there.

## Changing an item's fate

The most common action during the move:

1. Open the item.
2. Find the fate buttons.
3. Tap the fate you want — saves instantly. No save button.

| Fate | Color | Means |
|------|-------|-------|
| **KEEP** | Green | Taking it to NC |
| **SELL** | Orange | Selling before the move |
| **DONATE** | Purple | Giving it away |
| **TRASH** | Red | Throwing out |
| **UNDECIDED** | Gray | Not yet decided |

## AI price estimate (sell items only)

> Requires `ANTHROPIC_API_KEY` set in `/mnt/user/appdata/stash/repo/.env`
> on Unraid. If unset, the button returns "feature disabled."

1. Mark an item as **SELL**.
2. Open the item.
3. Tap the orange **Get AI Price Estimate** button.
4. After ~5 seconds you get a popup:
   - **Suggested price**
   - **Why** (condition, brand, demand)
   - **Where to sell** (Facebook Marketplace, OfferUp, eBay, etc.)

The suggestion is a starting point. Adjust based on how fast you want
the item gone.

## Scanning QR codes

The Scan tab is for finding things by their printed QR labels.

1. Tap the **Scan** tab.
2. Point camera at a QR code on a box or item.
3. The app auto-recognizes it and jumps to that item or container's
   detail page.

> No QR codes are printed yet — you generate label sheets via the admin
> dashboard's Export tab and print them out, then stick on the boxes.

## Settings tab

- **Your account** — name, email, role
- **Server URL** — where the app talks to. You shouldn't need to
  change this after first setup.
- **Sign Out**

## Troubleshooting

### "Login failed"
- Make sure WiFi or Tailscale is connected
- Check email + password
- Force-quit the app (swipe up from bottom, flick Stash up) and reopen

### Items spinning forever / not loading
- Pull down to refresh
- Check internet
- Make sure Tailscale is **connected** (green) when off home WiFi
- If still stuck: Settings → check Server URL is right for your network

### Camera doesn't work
- iOS asks for permission the first time. Tap **Allow**.
- If you said no by mistake: iPhone **Settings** → **Expo Go** →
  **Camera** → toggle ON.

### Photo upload fails
- Need internet
- Photos must be under 10 MB
- Try again — sometimes the connection drops

### App is slow or frozen
- Force-quit + reopen
- If that doesn't help: restart Expo Go entirely

### "Server URL" issues
- LAN: `http://192.168.1.153:3001` only works on home WiFi
- Tailscale: `http://100.122.58.114:3001` works anywhere if Tailscale is
  on
- Proxy URL `https://stash-api.shottsserver.com` only works once NPM is
  set up

---

## Quick reference

| Action | How |
|--------|-----|
| Search items | Tap search bar, type keywords |
| Filter by fate | Tap KEEP/SELL/DONATE/TRASH/UNDECIDED |
| Open an item | Tap its card |
| Change fate | Open item → tap a fate button |
| Take photo | Open item → Take Photo |
| Add new item | Tap blue + button |
| Scan QR | Scan tab → point camera |
| Refresh list | Pull down on item list |
| Sign out | Settings → Sign Out |
| Server URL | Settings → Server URL field |

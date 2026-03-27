# Stash — iPhone User Guide

This guide walks you through using the Stash app on your iPhone, step by step.

---

## Getting Started

### Step 1: Install Expo Go

1. Open the **App Store** on your iPhone
2. Search for **"Expo Go"**
3. Tap **Get** to install it
4. Wait for the download to finish

### Step 2: Connect to the Network

The Stash app connects to our server. You need to be on either:
- **Home WiFi** (when you're on the same network as the server)
- **Tailscale VPN** (when you're away from home — cellular, other WiFi)

If you're away from home, make sure **Tailscale** is turned on:
1. Open the **Tailscale** app on your iPhone
2. Toggle the switch to **Connected**
3. You should see a green dot / "Connected" status

### Step 3: Open the Stash App

1. Open **Expo Go** on your iPhone
2. The developer (James) will share a QR code or link to scan
3. Scan the QR code or enter the URL — the Stash app will load

---

## Signing In

When the app opens, you'll see the **Sign In** screen:

1. **Email**: Enter your email address (the one James set up for you)
2. **Password**: Enter your password
3. Tap **Sign In**

If the sign-in fails:
- Check that you're connected to WiFi or Tailscale
- Double-check your email and password
- Ask James to verify your account

---

## The Main Screens

After signing in, you'll see three tabs at the bottom of the screen:

| Tab | Icon | What It Does |
|-----|------|-------------|
| **Items** | Box icon | Browse, search, and manage all your items |
| **Scan** | Camera icon | Scan QR codes on boxes and items |
| **Settings** | Gear icon | Your account info and server settings |

---

## Browsing Items

The **Items** tab shows all your inventory as cards.

### Searching
1. Tap the **search bar** at the top
2. Type what you're looking for (e.g., "mixer" or "desk")
3. Results filter as you type

### Filtering by Fate
Below the search bar, you'll see filter buttons:
- **All** — Show everything
- **KEEP** — Items you're keeping
- **SELL** — Items to sell
- **DONATE** — Items to donate
- **TRASH** — Items to throw away
- **UNDECIDED** — Items not yet decided

Tap any button to filter. Tap **All** to go back to showing everything.

### Pull to Refresh
To get the latest data from the server:
1. Scroll to the top of the list
2. Pull down with your finger
3. Release — the list will refresh

---

## Viewing an Item

Tap any item card to see its full details:

- **Photo** — The item's picture (if one has been taken)
- **Name and Fate** — What it is and what's happening to it
- **Fate Buttons** — Tap to change the fate (Keep/Sell/Donate/Trash)
- **Details** — Category, condition, room, dimensions, weight
- **Container Placements** — Which box or tote this item is in

---

## Taking a Photo of an Item

1. Open an item by tapping its card
2. Tap **Take Photo**
3. Your camera will open
4. Point at the item and tap the **shutter button** (white circle)
5. Tap **Use Photo** to confirm
6. The photo uploads automatically to the server

You can also choose an existing photo from your library:
1. Tap **Choose Photo**
2. Browse your photo library
3. Tap the photo you want
4. It uploads automatically

---

## Adding a New Item

1. On the **Items** tab, tap the blue **+** button (bottom right)
2. Fill in the details:
   - **Name** (required) — What is this item? (e.g., "Standing Desk")
   - **Description** (optional) — Any extra details
   - **Category** — Tap to select (Furniture, Electronics, Kitchen, etc.)
   - **Condition** — Good, Fair, or Poor
   - **Fate** — Keep, Sell, Donate, Trash, or Undecided
   - **Origin Room** — Which room is this item in right now?
   - **Quantity** — How many? (usually 1)
3. Tap **Create Item**
4. You'll be taken to the item's detail page where you can add a photo

---

## Changing an Item's Fate

This is the most common action during the move:

1. Open the item (tap its card)
2. Find the **Fate** section
3. Tap the fate you want:
   - **KEEP** (green) — Taking it to the new house
   - **SELL** (orange) — Selling it before the move
   - **DONATE** (purple) — Giving it away
   - **TRASH** (red) — Throwing it out
   - **UNDECIDED** (gray) — Haven't decided yet
4. The change saves immediately — no need to tap a save button

---

## Getting a Price Estimate (Sell Items)

If an item is marked as **SELL**, you can ask the AI for a price suggestion:

1. Open the item
2. Tap the orange **Get AI Price Estimate** button
3. Wait a few seconds — the AI is thinking
4. A popup will show:
   - **Suggested price** (e.g., "$150")
   - **Why that price** (condition, brand, demand)
   - **Where to sell** (Facebook Marketplace, OfferUp, etc.)

This uses our AI assistant to research comparable prices. The suggestion is
a starting point — you can adjust based on how quickly you want it to sell.

---

## Scanning QR Codes

QR code labels can be printed and stuck on boxes and items:

1. Tap the **Scan** tab (camera icon at the bottom)
2. Point your camera at a Stash QR code
3. The app will automatically:
   - Recognize the QR code
   - Open the item or container it belongs to
4. No need to tap anything — it reads automatically

**What you'll see:** When you scan a box label, the app jumps straight to
that item's detail page showing everything about it.

---

## Settings

The **Settings** tab shows:
- **Your account** — Name, email, role
- **Server URL** — Where the app connects to (James will set this up)
- **Sign Out** button

You shouldn't need to change anything here. If the app can't connect,
James may ask you to update the Server URL.

---

## Troubleshooting

### "Login Failed"
- Make sure you're connected to WiFi or Tailscale
- Check your email and password are correct
- Try closing the app completely and reopening

### Items not loading / spinning forever
- Pull down to refresh
- Check your internet connection
- Make sure Tailscale is connected (if not on home WiFi)

### Camera not working
- The first time you use the camera, iOS will ask for permission
- Tap **Allow** when prompted
- If you accidentally denied it: go to iPhone **Settings** → **Expo Go** → **Camera** → toggle ON

### Photos not uploading
- Make sure you have a good internet connection
- Photos must be under 10 MB
- Try taking the photo again

### App seems slow or frozen
- Close the app completely (swipe up from the bottom, swipe the app away)
- Reopen Expo Go and load Stash again

---

## Quick Reference

| Action | How |
|--------|-----|
| Search items | Tap search bar, type keywords |
| Filter by fate | Tap KEEP/SELL/DONATE/TRASH buttons |
| View item details | Tap any item card |
| Change fate | Open item → tap a fate button |
| Take photo | Open item → Take Photo |
| Add new item | Tap blue + button |
| Scan QR code | Tap Scan tab → point camera |
| Refresh list | Pull down on item list |
| Sign out | Settings tab → Sign Out |

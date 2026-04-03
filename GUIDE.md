# Stash — User Guide

Complete guide to using Stash for inventory management and move planning.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Adding Items](#adding-items)
3. [Taking Photos](#taking-photos)
4. [Changing an Item's Fate](#changing-an-items-fate)
5. [Selling Items](#selling-items)
6. [Creating Containers](#creating-containers)
7. [Placing Items in Containers](#placing-items-in-containers)
8. [Moving Items Between Rooms](#moving-items-between-rooms)
9. [Searching and Filtering](#searching-and-filtering)
10. [QR Code Labels](#qr-code-labels)
11. [Floor Plan View](#floor-plan-view)
12. [Importing from a Spreadsheet](#importing-from-a-spreadsheet)
13. [Exporting and Printing](#exporting-and-printing)
14. [Managing Users](#managing-users)

---

## Getting Started

### What is Stash?

Stash tracks every item in your home during a move. For each item, you decide its **fate**:

| Fate | Color | Meaning |
|------|-------|---------|
| **KEEP** | Green | Taking it to the new house |
| **SELL** | Orange | Selling before the move |
| **DONATE** | Purple | Giving away to charity |
| **TRASH** | Red | Throwing it out |
| **UNDECIDED** | Gray | Haven't decided yet |

Items can be placed into **containers** (U-Box, totes, boxes) and assigned to **rooms** in both the origin house and the destination house.

### Logging In

**Admin Dashboard (computer):**
1. Open https://stash.shottsserver.com (or http://localhost:3002 for local dev)
2. Enter your email and password
3. Click **Sign In**

**Mobile App (phone):**
1. Open Expo Go
2. Load the Stash app
3. Enter your email and password
4. Tap **Sign In**

---

## Adding Items

### From the Admin Dashboard

1. Click **Items** in the sidebar
2. Click the **+ Add Item** button (top right)
3. Fill in the details:

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | Yes | What is this item? ("Standing Desk", "KitchenAid Mixer") |
| **Description** | No | Extra details ("Gray L-shaped sectional, 3 pieces") |
| **Category** | Yes | Select from: Furniture, Electronics, Kitchen, etc. |
| **Condition** | No | Good, Fair, or Poor (defaults to Good) |
| **Fate** | No | Keep, Sell, Donate, Trash, or Undecided (defaults to Undecided) |
| **Origin Room** | Yes | Which room is this item in RIGHT NOW? |
| **Destination Room** | No | Which room will it go to in the new house? |
| **Quantity** | No | How many? (defaults to 1, use for sets like "6 dining chairs") |
| **Dimensions** | No | Length, Width, Height in inches |
| **Weight** | No | Weight in pounds |
| **Notes** | No | Any additional info |

4. Click **Create Item**
5. You'll be taken to the item detail page where you can add a photo

### From the Mobile App

1. Tap the **+** button (blue circle, bottom right of Items tab)
2. Fill in the same fields using chip selectors for Category, Condition, Fate, and Room
3. Tap **Create Item**
4. On the item detail page, tap **Take Photo** to photograph it

### Tips for Adding Items

- **Be specific with names.** "Dell 27-inch Monitor" is better than "Monitor"
- **Use description for distinguishing details.** If you have two desks, describe each one
- **Set the fate immediately if you know it.** Undecided items pile up fast
- **Add dimensions for items going in containers.** This helps the 3D container view show fill level
- **Don't skip the room.** The floor plan view groups items by room — it's how you track progress

---

## Taking Photos

Photos help you remember what items look like and are useful when selling.

### Admin Dashboard

1. Open any item (click its card)
2. In the Photo section, click **Upload Photo**
3. Select a photo from your computer
4. The photo uploads automatically

### Mobile App

1. Open any item (tap its card)
2. Tap **Take Photo** to use the camera, or **Choose Photo** to pick from your library
3. Point at the item and tap the shutter button
4. The photo uploads automatically

### Photo Tips

- **One photo per item.** The photo replaces the previous one if you upload again
- **Good lighting matters.** Natural light works best for sell items
- **Include context.** Show the whole item, not just a close-up
- **For sell items:** take a photo that would work as a marketplace listing
- **Supported formats:** JPEG, PNG, WebP, HEIC (iPhone photos work)
- **Max size:** 10 MB per photo

---

## Changing an Item's Fate

The most common action during move planning. Every item needs a fate.

### Quick Fate Change (Admin)

1. Open any item
2. In the **Fate** section (right sidebar), click the fate you want
3. The change saves instantly — no save button needed

### Quick Fate Change (Mobile)

1. Open any item
2. Tap one of the fate buttons (KEEP, SELL, DONATE, TRASH, UNDECIDED)
3. The change saves instantly

### Bulk Decision Strategy

The fastest way to process items is room by room:
1. Go to **Floor Plan** in the sidebar
2. Find a room with lots of UNDECIDED (gray) items
3. Click that room to see all its items
4. Click each item and set its fate
5. Watch the room's fate bar turn from gray to green/orange/purple/red

---

## Selling Items

### Setting Up a Sell Item

1. Set the item's fate to **SELL**
2. (Optional) Enter your own **Estimated Sale Value** in the edit form
3. Click **Get Price Estimate** in the AI Price Estimate card
4. Claude will suggest a price, explain why, and recommend selling platforms

### What the AI Price Estimate Gives You

- **Suggested Price** — Based on the item's name, description, condition, and category
- **Rationale** — 2-3 sentences explaining the price (brand value, condition, market demand)
- **Recommended Platforms** — Where to list it (Facebook Marketplace, OfferUp, Craigslist, etc.)

### Printing a Sell List

1. Go to **Export** in the sidebar
2. Click **Sell List** → Download PDF
3. The PDF shows every SELL item with your estimate and the AI estimate
4. Use this as a checklist when photographing and listing items

### Tips for Selling

- **Price to sell fast.** You're moving — items need to go. The AI prices for quick sale, not maximum profit
- **List on multiple platforms.** Facebook Marketplace and OfferUp have the most local buyers
- **Take good photos first.** Add them to Stash, then use the same photos for listings
- **Update the sale value** once you decide on a listing price

---

## Creating Containers

Containers are physical boxes, totes, and U-Boxes that hold items during the move.

### Container Types

| Type | Dimensions | Max Weight | Use For |
|------|-----------|------------|---------|
| **U-Box** | 95"L × 56"W × 83"H | 2,000 lbs | Large shipment — furniture, boxes, everything |
| **27-Gallon Tote** | 24"L × 16"W × 14"H | 50 lbs | Kitchen items, books, toys |
| **Small Box** | 16"L × 12"W × 12"H | 40 lbs | Small items, fragile things |
| **Medium Box** | 18"L × 18"W × 16"H | 50 lbs | General purpose |
| **Large Box** | 24"L × 18"W × 18"H | 65 lbs | Bulky lightweight items |
| **Custom** | You set dimensions | You set weight | Anything else (cedar chest, wardrobe box, etc.) |

### How to Create a Container

Containers are created through the API or seed data. In a future update, there will be a "Create Container" form in the admin dashboard.

For now, containers are created in the database seed. The seed creates 3 sample containers:
- **UBOX-001** — U-Box #1 (Living Room)
- **KITCHEN-T01** — Kitchen Tote #1
- **OFFICE-B01** — Books Box (Office)

### Labeling Physical Containers

1. Go to **Export** → **QR Label Sheet** → Download PDF
2. Print the labels (2 per row, with QR codes)
3. Cut along the borders
4. Stick one label on each physical box/tote
5. Scanning the QR code with the mobile app opens that container's contents

---

## Placing Items in Containers

### From the Admin Dashboard

1. Open any item (click its card in the Items list)
2. In the right sidebar, find the **Container** section
3. Select a container from the dropdown (e.g., "UBOX-001 — U-Box #1")
4. Click **Place**
5. The item now shows as placed in that container

### Removing an Item from a Container

1. Open the item
2. In the Container section, click **Remove** next to the container name
3. The item is removed (the placement history is kept)

### From the Container Detail Page

1. Go to **Containers** in the sidebar
2. Click a container to see its contents
3. The **Items Inside** table shows everything in that container
4. Click **Remove** to take an item out

### Viewing the 3D Container View

On any container detail page, the top section shows a **3D visualization**:
- The wireframe box represents the container dimensions
- Colored blocks represent items inside (colored by fate)
- **Volume Fill %** shows how full the container is
- **Weight** shows total weight vs. max weight
- Warning indicators appear at 85% volume or over max weight
- Click and drag to rotate, scroll to zoom

---

## Moving Items Between Rooms

### Changing an Item's Origin Room

The origin room is where the item is RIGHT NOW (in your current house):

1. Open the item
2. Click **Edit**
3. Change the **Origin Room** dropdown
4. Click **Save**

### Assigning a Destination Room

The destination room is where the item will go in the new house:

1. Open the item
2. Click **Edit**
3. Set the **Destination Room** dropdown
4. Click **Save**

### Tracking Progress by Room

The **Floor Plan** page shows each room as a card with:
- Total item count
- Fate breakdown bar (green = KEEP, orange = SELL, etc.)
- A room is "done" when it has no gray (UNDECIDED) items

---

## Searching and Filtering

### Searching

Type in the search bar to find items by name, description, or notes.

### Filtering by Fate

Click the fate buttons above the item list:
- **All** — Show everything
- **KEEP** — Only items being kept
- **SELL** — Only items to sell
- **DONATE** — Only items to donate
- **TRASH** — Only items to trash
- **UNDECIDED** — Items that still need a decision

### Combining Filters

Filters are URL-based. You can combine search + fate:
- `http://localhost:3002/items?fate=SELL&search=desk` — sell items matching "desk"
- Bookmark filtered views for quick access

---

## QR Code Labels

### Generating QR Codes

QR codes are generated for items and containers:

**For a single item:**
1. The API generates them automatically, or you can trigger via the API

**For all containers (printable sheet):**
1. Go to **Export** in the sidebar
2. Click **QR Label Sheet** → Download PDF
3. Print on regular paper
4. Cut along the borders
5. Tape or stick to the physical container

### Scanning QR Codes (Mobile App)

1. Tap the **Scan** tab (camera icon at the bottom)
2. Point your camera at a Stash QR code
3. The app automatically recognizes it and opens that item or container
4. No need to tap anything — it reads the code instantly

### Use Case: Unpacking Day

1. Before the move: print QR labels for all packed containers
2. Stick a label on each physical box/tote
3. On unpacking day: scan a box's QR code
4. Instantly see what's inside without opening it
5. Know which room it should go to (destination is shown)

---

## Floor Plan View

The floor plan shows a visual overview of your entire house, room by room.

### How to Use It

1. Go to **Floor Plan** in the sidebar
2. Toggle between **Origin (Utah)** and **Destination (NC)**
3. Each room shows:
   - Room name and total item count
   - Fate breakdown bar (green/orange/purple/red/gray)
   - Quick fate counts (K:5, S:2, D:1)
4. Click any room to see all its items

### What to Look For

- **Rooms with lots of gray (UNDECIDED):** These need attention — go decide!
- **Rooms with high item counts:** Start packing these first
- **Destination view:** Shows where KEEP items are going

---

## Importing from a Spreadsheet

If you have an existing inventory in Excel or Google Sheets:

### Steps

1. Export your spreadsheet as a **.csv file**
2. Go to **Import** in the admin sidebar
3. Drag and drop the CSV file (or click to browse)
4. **Map columns:** The import wizard shows your CSV columns and lets you match them to Stash fields:
   - "Item Name" → Name
   - "Room" → Origin Room
   - "Category" → Category
   - "Status" → Fate
5. Columns with matching names auto-map (e.g., "Name" auto-maps to Name)
6. Preview the first 5 rows to verify the mapping
7. Click **Import X Items**
8. See the result: how many created vs. any errors

### Tips

- The **Name** column is required — everything else is optional
- Category and Room names are matched case-insensitively ("kitchen" matches "Kitchen")
- Unrecognized categories default to the first category
- You can import the same CSV multiple times — it creates new items each time (not updates)

---

## Exporting and Printing

### Available Exports

| Export | Format | What It Contains |
|--------|--------|------------------|
| **Sell List** | PDF | All SELL items with your estimate and AI price |
| **Donate List** | PDF | All DONATE items — use as charity receipt |
| **QR Label Sheet** | PDF | Printable QR code stickers for containers |
| **Container Manifest** | PDF | Contents of a specific container (tape to the box) |
| **All Items** | CSV | Full inventory spreadsheet |
| **Sell Items Only** | CSV | Just the SELL items as a spreadsheet |

### How to Export

1. Go to **Export** in the sidebar
2. Click **Download PDF** or **Download CSV** for the export you want
3. The file downloads to your computer

### Printing Tips

- **QR Labels:** Print on regular paper, cut, and tape to boxes
- **Container Manifests:** Print one per container, tape to the outside of the box
- **Sell List:** Keep a printed copy to track which items have been listed/sold
- **Donate List:** Give to the charity for their records (and your tax deduction)

---

## Managing Users

Admin users can manage other users' accounts.

### Adding a New User

1. Go to **Users** in the sidebar
2. Click **+ Add User**
3. Enter name, email, password, and role (User or Admin)
4. Click **Create User**
5. The new user must change their password on first login

### Roles

| Role | Can Do |
|------|--------|
| **User** | View/create/edit items, upload photos, use the mobile app |
| **Admin** | Everything a User can do PLUS manage users, import/export, view activity log |

### Resetting a Password

1. Go to **Users**
2. Click **Reset PW** next to the user
3. Enter a new password (minimum 8 characters)
4. The user will be required to change it on next login

### Deleting a User

1. Go to **Users**
2. Click **Delete** next to the user
3. Confirm the deletion
4. Their items are automatically reassigned to you (the admin)
5. You cannot delete yourself or the last admin

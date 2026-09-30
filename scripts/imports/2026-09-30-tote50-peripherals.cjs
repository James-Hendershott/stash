// One-off import: HDX 27-gal tote #50 ("Peripherals") and its 28 items,
// identified from James's photos (vault: projects/active/stash/untitled folder/HDX-yellow-tote50).
// Photos were converted HEIC → JPEG (1600px) and copied to DATA_PATH/images/ first.
//
// Idempotent: if tote #50 already exists it does nothing.
//
//   Get-Content scripts\imports\2026-09-30-tote50-peripherals.cjs | ssh unraid "docker exec -i -w /app/packages/backend stash-backend node -"

const { PrismaClient } = require('@prisma/client');

const TOTE = {
  number: 50,
  label: 'T27-0050', // legacy unique code column; the printed ID is the number
  name: 'Tote #50',
  description: 'Peripherals — keyboards, controllers, headphones, external hard drives, etc.',
  model: ['HDX', '27 Gal Tough Storage Tote'],
  bodyColor: 'Black',
  lidColor: 'Yellow',
  category: ['Electronics & Tech', null],
};

const C = (sub) => ['Electronics & Tech', sub];
// [name, description, category, photo, quantity]
const ITEMS = [
  ['TP-Link USB 3.0 to Gigabit Ethernet Adapter', 'Foldable USB 3.0 → Gigabit Ethernet adapter, in box.', C('Networking & Homelab'), 'IMG_2897', 1],
  ['AOKO M.2 SATA/NVMe SSD & 2.5" SATA to USB 3.2 Adapter (AE10GR)', 'Drive-to-USB adapter, in box. Drive not included.', C('Computers & Parts'), 'IMG_2898', 1],
  ['Verbatim BD-R Blu-ray Discs 25GB 16x (10-pack)', 'Blank recordable Blu-ray discs, spindle.', C('Computers & Parts'), 'IMG_2899', 1],
  ['X-GO Model C27-C (black USB-powered bar — identify)', 'Model C27-C, input 5V 1A. What is it? Second photo: IMG_2901 in the vault folder.', C(null), 'IMG_2900', 1],
  ['Honeywell Home RTH9585WF Smart Color Thermostat', 'Wi-Fi smart thermostat, in box.', C('Networking & Homelab'), 'IMG_2902', 1],
  ['TP-Link RE215 AC1200 Wi-Fi Range Extender', 'Plug-in Wi-Fi extender.', C('Networking & Homelab'), 'IMG_2903', 1],
  ['DGODRT 4-Port HDMI KVM Switch (4K)', 'HDMI KVM switch, in box.', C('Computers & Parts'), 'IMG_2905', 1],
  ['Sabrent USB 3.0 SATA Hard Drive Flat Docking Station', 'For 2.5"/3.5" SATA drives, in box.', C('Computers & Parts'), 'IMG_2906', 1],
  ['OWC Mercury Pro External USB Optical Drive', 'Reads/writes CD, DVD, Blu-ray, M-DISC. In box.', C('Computers & Parts'), 'IMG_2907', 1],
  ['AC Infinity AIRTAP Register Booster Fan (AC-RBF4-W, 4"×10")', 'Vent booster fan, 12V. Second photo: IMG_2909.', ['Tools & Hardware', null], 'IMG_2908', 1],
  ['Apple MacBook Pro 13" (A1502, refurbished, 8GB/512GB)', 'Apple Certified Refurbished, in original box. Label photo: IMG_2910.', C('Computers & Parts'), 'IMG_2911', 1],
  ['Amazon Kindle Paperwhite (10th generation)', 'E-reader, 32 GB model.', C(null), 'IMG_2912', 1],
  ['EMEET 1080P Webcam', 'USB webcam with privacy cover.', C('Audio & Video'), 'IMG_2913', 1],
  ['Samsung Galaxy Tab A 8.0 (SM-T350, 16GB)', 'Android tablet.', C('Computers & Parts'), 'IMG_2914', 1],
  ['HP Pavilion x2 Tablet/Notebook', 'Detachable 2-in-1.', C('Computers & Parts'), 'IMG_2915', 1],
  ['Redragon DITI Pro One-Handed Mechanical Keyboard', 'Wireless, hot-swappable, RGB. In box.', C('Computers & Parts'), 'IMG_2916', 1],
  ['Acer Wired Gaming Mouse (OMW117)', 'Braided cable.', C('Computers & Parts'), 'IMG_2917', 1],
  ['Epomaker EK21 VIA Numpad', '20% triple-mode, hot-swappable RGB number pad. In box.', C('Computers & Parts'), 'IMG_2918', 1],
  ['NuPhy NuFolio V2 Keyboard Case & Stand (for Air96 V2)', 'Yellow keyboard case / device stand.', C('Computers & Parts'), 'IMG_2919', 1],
  ['Arzopa 16.1" 144Hz Portable Monitor', 'Portable USB-C/HDMI monitor, in box.', C('Computers & Parts'), 'IMG_2920', 1],
  ['Corsair M75 Air Wireless Gaming Mouse', 'Ultra-lightweight, white. In box.', C('Computers & Parts'), 'IMG_2921', 1],
  ['Syma S107H-E RC Helicopter', '3.5-channel remote-control helicopter, in box.', ['Kids & Baby', 'Toys'], 'IMG_2922', 1],
  ['DJI Neo Drone (Combo)', 'Palm-sized camera drone, combo bundle. Back of box: IMG_2924.', C('Cameras'), 'IMG_2923', 1],
  ['Veeniix V995 Mini Drone', 'Beginner/kids mini drone, in box. Label photo: IMG_2926.', ['Kids & Baby', 'Toys'], 'IMG_2925', 1],
  ['K600 GPS Drone', 'GPS camera drone (Karuisrc) — photo is the user manual.', C('Cameras'), 'IMG_2927', 1],
  ['Kids Digital Cameras (blue & green)', 'Two toy cameras with lanyards.', ['Kids & Baby', 'Toys'], 'IMG_2928', 2],
  ['Sony Cyber-shot Compact Camera (20.1 MP)', 'Black point-and-shoot with wrist strap.', C('Cameras'), 'IMG_2929', 1],
  ['Olympus FE-310 Digital Camera', 'Silver compact camera.', C('Cameras'), 'IMG_2930', 1],
];

async function categoryId(prisma, [top, sub]) {
  const parent = await prisma.category.findFirst({ where: { name: top, parentId: null } });
  if (!parent) throw new Error(`Missing category ${top}`);
  if (!sub) return parent.id;
  const child = await prisma.category.findFirst({ where: { name: sub, parentId: parent.id } });
  if (!child) throw new Error(`Missing category ${top} › ${sub}`);
  return child.id;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (await prisma.container.findUnique({ where: { number: TOTE.number } })) {
      console.log(`Tote #${TOTE.number} already exists — nothing to do.`);
      return;
    }
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
    const model = await prisma.containerModel.findUnique({ where: { brand_name: { brand: TOTE.model[0], name: TOTE.model[1] } } });

    // Resolve every category first so a typo aborts before anything is written.
    const toteCat = await categoryId(prisma, TOTE.category);
    const cats = [];
    for (const it of ITEMS) cats.push(await categoryId(prisma, it[2]));

    await prisma.$transaction(async (tx) => {
      const toteItem = await tx.item.create({
        data: {
          name: TOTE.name, description: TOTE.description, categoryId: toteCat, isContainer: true,
          addedById: admin.id, lastModifiedById: admin.id,
          container: {
            create: {
              number: TOTE.number, label: TOTE.label, containerType: 'TOTE_27GAL', modelId: model?.id ?? null,
              bodyColor: TOTE.bodyColor, lidColor: TOTE.lidColor, status: 'PACKING',
              // legacy NOT NULL columns — HDX 27-gal interior (shared/container-defaults)
              internalLengthIn: 28.3, internalWidthIn: 18.5, internalHeightIn: 13.6, maxWeightLbs: 75,
            },
          },
        },
        include: { container: true },
      });

      for (const [i, [name, description, , photo, quantity]] of ITEMS.entries()) {
        const item = await tx.item.create({
          data: {
            name, description, quantity, categoryId: cats[i],
            photoPath: `images/tote50-${photo}.jpg`,
            addedById: admin.id, lastModifiedById: admin.id,
          },
        });
        await tx.itemPlacement.create({
          data: { itemId: item.id, containerId: toteItem.container.id, placedById: admin.id, notes: 'Imported from photos 2026-09-30' },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: admin.id, action: 'IMPORT', entityType: 'Container', entityId: toteItem.container.id,
          newValue: { tote: TOTE.number, items: ITEMS.map((i) => i[0]) },
        },
      });
      console.log(`Created tote #${TOTE.number} with ${ITEMS.length} items.`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exitCode = 1; });

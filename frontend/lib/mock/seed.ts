/**
 * Seed dataset untuk mock API.
 *
 * Direplikasi dari `backend/database/seeders/*` supaya demo menampilkan data
 * yang sama dengan backend aslinya (5 cabang, 11 user, 6 kategori, 15 item,
 * 5 supplier, 5 resep, dst.). Ditambah beberapa data transaksional (batch,
 * log produksi, notifikasi) supaya halaman-halaman tersebut tidak kosong
 * di demo.
 */

import type { UserRole } from "@/lib/types";
import {
  dateFromNow,
  makeRng,
  timestampDaysAgo,
  type Rng,
} from "./random";

export interface BranchRow {
  id: number;
  name: string;
  address: string;
  manager: string;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branch_id: number | null;
  position: string | null;
  hire_date: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ItemRow {
  id: number;
  name: string;
  barcode: string;
  default_supplier_id: number | null;
  category_id: number;
  unit: string;
  threshold: number;
  is_perishable: boolean;
  cost_price: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRow {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeItemRow {
  id: number;
  recipe_id: number;
  item_id: number;
  quantity: number;
}

export interface RecipeRow {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  items: RecipeItemRow[];
}

export interface BranchStockRow {
  id: number;
  branch_id: number;
  item_id: number;
  quantity: number;
  storage_location: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovementRow {
  id: number;
  branch_id: number;
  item_id: number;
  type: "in" | "out";
  quantity: number;
  note: string | null;
  reason: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemRow {
  id: number;
  purchase_order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
}

export interface PurchaseOrderRow {
  id: number;
  supplier_id: number;
  branch_id: number;
  user_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemRow[];
}

export interface OpnameItemRow {
  id: number;
  stock_opname_id: number;
  item_id: number;
  qty_system: number;
  qty_fisik: number | null;
  selisih: number | null;
}

export interface OpnameRow {
  id: number;
  branch_id: number;
  user_id: number;
  status: string;
  approved_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OpnameItemRow[];
}

export interface TransferItemRow {
  id: number;
  stock_transfer_id: number;
  item_id: number;
  quantity: number;
}

export interface TransferRow {
  id: number;
  from_branch_id: number;
  to_branch_id: number;
  user_id: number;
  approved_by: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: TransferItemRow[];
}

export interface BatchRow {
  id: number;
  branch_id: number;
  item_id: number;
  batch_code: string;
  quantity: number;
  production_date: string;
  expiry_date: string | null;
  storage_location: string;
  cost_price: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionLogItemRow {
  id: number;
  production_log_id: number;
  item_id: number;
  quantity_used: number;
}

export interface ProductionLogRow {
  id: number;
  branch_id: number;
  recipe_id: number;
  user_id: number;
  quantity: number;
  produced_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: ProductionLogItemRow[];
}

export interface ActivityLogRow {
  id: number;
  user_id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface MockDb {
  branches: BranchRow[];
  users: UserRow[];
  categories: CategoryRow[];
  items: ItemRow[];
  suppliers: SupplierRow[];
  recipes: RecipeRow[];
  branchStocks: BranchStockRow[];
  movements: MovementRow[];
  purchaseOrders: PurchaseOrderRow[];
  opnames: OpnameRow[];
  transfers: TransferRow[];
  batches: BatchRow[];
  productionLogs: ProductionLogRow[];
  activityLogs: ActivityLogRow[];
  notifications: NotificationRow[];
}

interface BranchProfile {
  name: string;
  address: string;
  manager: string;
  qtyMultiplier: number;
  lowStock: boolean;
  expiredRate: number;
  movementCount: [number, number];
  movementRatioIn: number;
}

const BRANCH_PROFILES: BranchProfile[] = [
  {
    name: "MyBakery Pusat",
    address: "Jl. Raya Utama No. 1, Jakarta Pusat",
    manager: "Budi Santoso",
    qtyMultiplier: 1.0,
    lowStock: false,
    expiredRate: 0.1,
    movementCount: [40, 70],
    movementRatioIn: 0.7,
  },
  {
    name: "MyBakery Cabang Bandung",
    address: "Jl. Asia Afrika No. 88, Bandung",
    manager: "Siti Rahayu",
    qtyMultiplier: 0.75,
    lowStock: false,
    expiredRate: 0.35,
    movementCount: [25, 50],
    movementRatioIn: 0.55,
  },
  {
    name: "MyBakery Cabang Surabaya",
    address: "Jl. Basuki Rahmat No. 45, Surabaya",
    manager: "Dewi Lestari",
    qtyMultiplier: 0.5,
    lowStock: true,
    expiredRate: 0.1,
    movementCount: [35, 65],
    movementRatioIn: 0.5,
  },
  {
    name: "MyBakery Cabang Yogyakarta",
    address: "Jl. Malioboro No. 12, Yogyakarta",
    manager: "Andi Prasetyo",
    qtyMultiplier: 0.25,
    lowStock: true,
    expiredRate: 0.5,
    movementCount: [10, 25],
    movementRatioIn: 0.4,
  },
  {
    name: "MyBakery Cabang Semarang",
    address: "Jl. Pandanaran No. 33, Semarang",
    manager: "Rina Wulandari",
    qtyMultiplier: 0.4,
    lowStock: true,
    expiredRate: 0.15,
    movementCount: [15, 35],
    movementRatioIn: 0.6,
  },
];

const CATEGORY_NAMES = [
  "Dairy",
  "Dry Goods",
  "Frozen",
  "Wet Ingredients",
  "Packaging",
  "Flavorings",
];

interface ItemSeed {
  name: string;
  category: string;
  unit: string;
  threshold: number;
  isPerishable: boolean;
  costPrice: number;
  defaultSupplierId: number | null;
  baseQty: [number, number];
  expiryDays: [number, number];
}

const ITEM_SEEDS: ItemSeed[] = [
  { name: "Telur", category: "Wet Ingredients", unit: "pcs", threshold: 50, isPerishable: true, costPrice: 2500, defaultSupplierId: 5, baseQty: [80, 200], expiryDays: [5, 45] },
  { name: "Mentega", category: "Dairy", unit: "kg", threshold: 5, isPerishable: true, costPrice: 45000, defaultSupplierId: 2, baseQty: [10, 30], expiryDays: [5, 30] },
  { name: "Susu Cair", category: "Dairy", unit: "liter", threshold: 10, isPerishable: true, costPrice: 18000, defaultSupplierId: 2, baseQty: [15, 40], expiryDays: [2, 14] },
  { name: "Keju Cheddar", category: "Dairy", unit: "kg", threshold: 3, isPerishable: true, costPrice: 85000, defaultSupplierId: 2, baseQty: [5, 15], expiryDays: [10, 60] },
  { name: "Susu Bubuk", category: "Dairy", unit: "kg", threshold: 5, isPerishable: false, costPrice: 65000, defaultSupplierId: 2, baseQty: [8, 20], expiryDays: [90, 240] },
  { name: "Tepung Terigu", category: "Dry Goods", unit: "kg", threshold: 20, isPerishable: false, costPrice: 12000, defaultSupplierId: 1, baseQty: [40, 100], expiryDays: [120, 300] },
  { name: "Gula Pasir", category: "Dry Goods", unit: "kg", threshold: 10, isPerishable: false, costPrice: 15000, defaultSupplierId: 3, baseQty: [20, 60], expiryDays: [180, 365] },
  { name: "Gula Halus", category: "Dry Goods", unit: "kg", threshold: 5, isPerishable: false, costPrice: 18000, defaultSupplierId: 3, baseQty: [8, 25], expiryDays: [180, 365] },
  { name: "Cokelat Bubuk", category: "Dry Goods", unit: "kg", threshold: 3, isPerishable: false, costPrice: 55000, defaultSupplierId: 5, baseQty: [5, 15], expiryDays: [180, 365] },
  { name: "Ragi Instan", category: "Dry Goods", unit: "kg", threshold: 2, isPerishable: false, costPrice: 35000, defaultSupplierId: 1, baseQty: [5, 15], expiryDays: [180, 365] },
  { name: "Minyak Sayur", category: "Dry Goods", unit: "liter", threshold: 5, isPerishable: false, costPrice: 14000, defaultSupplierId: 5, baseQty: [10, 30], expiryDays: [180, 365] },
  { name: "Pewarna Makanan", category: "Wet Ingredients", unit: "pcs", threshold: 5, isPerishable: false, costPrice: 5000, defaultSupplierId: 5, baseQty: [10, 30], expiryDays: [180, 365] },
  { name: "Es Krim Vanila", category: "Frozen", unit: "kg", threshold: 5, isPerishable: true, costPrice: 42000, defaultSupplierId: 4, baseQty: [8, 20], expiryDays: [3, 21] },
  { name: "Vanili", category: "Flavorings", unit: "pcs", threshold: 3, isPerishable: false, costPrice: 8000, defaultSupplierId: 5, baseQty: [3, 10], expiryDays: [180, 365] },
  { name: "Roti Tawar", category: "Packaging", unit: "pcs", threshold: 10, isPerishable: true, costPrice: 3500, defaultSupplierId: 5, baseQty: [20, 50], expiryDays: [2, 6] },
];

const SUPPLIER_SEEDS = [
  { name: "PT Tepung Sejahtera", contact_person: "Hendra Wijaya", phone: "0812-3456-7890", email: "hendra@tepungsejahtera.co.id", address: "Jl. Industri Raya No. 15, Tangerang", lead_time_days: 2 },
  { name: "CV Dairy Fresh", contact_person: "Sari Dewi", phone: "0813-9876-5432", email: "sari@dairyfresh.co.id", address: "Jl. Peternakan Utama No. 8, Bogor", lead_time_days: 1 },
  { name: "PT Gula Nusantara", contact_person: "Budi Santoso", phone: "0821-1234-5678", email: "budi@gulanusantara.co.id", address: "Jl. Perkebunan No. 22, Palembang", lead_time_days: 3 },
  { name: "PT Frozen Food Indonesia", contact_person: "Rina Hartati", phone: "0856-7890-1234", email: "rina@frozenfood.id", address: "Jl. Raya Bekasi Km 25, Bekasi", lead_time_days: 2 },
  { name: "UD Bahan Kue Makmur", contact_person: "Dedi Kurniawan", phone: "0878-4567-8901", email: "dedi@bahankue.co.id", address: "Jl. Pasar Pagi No. 3, Jakarta Timur", lead_time_days: 1 },
];

const RECIPE_SEEDS: { name: string; description: string; items: [string, number][] }[] = [
  {
    name: "Roti Tawar Gandum",
    description: "Roti tawar gandum premium untuk sarapan",
    items: [["Tepung Terigu", 5], ["Gula Pasir", 0.5], ["Telur", 2], ["Mentega", 0.3], ["Ragi Instan", 0.01]],
  },
  {
    name: "Kue Cokelat Chip",
    description: "Kue kering cokelat chip renyah",
    items: [["Tepung Terigu", 2], ["Gula Halus", 1], ["Mentega", 0.5], ["Telur", 1], ["Cokelat Bubuk", 0.3]],
  },
  {
    name: "Donat Cokelat",
    description: "Donat lembut dengan topping cokelat",
    items: [["Tepung Terigu", 3], ["Gula Pasir", 0.5], ["Telur", 2], ["Mentega", 0.2], ["Susu Cair", 0.5], ["Ragi Instan", 0.01], ["Cokelat Bubuk", 0.5]],
  },
  {
    name: "Cheese Cake",
    description: "Kue keju lembut dengan base biskuit",
    items: [["Keju Cheddar", 1], ["Susu Cair", 0.5], ["Telur", 3], ["Gula Halus", 0.5], ["Mentega", 0.2]],
  },
  {
    name: "Croissant Butter",
    description: "Croissant butter renyah dan berlapis",
    items: [["Tepung Terigu", 4], ["Mentega", 1.5], ["Telur", 1], ["Gula Pasir", 0.3], ["Ragi Instan", 0.01]],
  },
];

const IN_NOTES = [
  "Restok mingguan dari supplier",
  "Pengiriman dari distributor",
  "Restok bulanan",
  "Stok awal bulan",
  "Pembelian cash",
  "Pengiriman mendadak",
  "Restok bahan kue order besar",
  "Pengadaan rutin",
  "Stok tambahan untuk event",
  "Restok karena promosi",
];

const OUT_NOTES = [
  "Pemakaian produksi harian",
  "Order klien catering",
  "Pemakaian event",
  "Stok habis terjual",
  "Bahan untuk pesanan wedding",
  "Pemakaian kue ulang tahun",
  "Pengiriman order online",
  "Pemakaian demo produk",
  "Bahan expired, buang",
  "Retur ke supplier",
];

const LOSS_REASONS = ["expired", "damaged", "return", "other", null];

const POS_CONFIG: { status: string; items: [number, number]; notes: string }[][] = [
  [
    { status: "draft", items: [2, 4], notes: "PO rutin bulanan, menunggu review" },
    { status: "sent", items: [3, 5], notes: "Sudah dikirim ke supplier, menunggu pengiriman" },
    { status: "received", items: [2, 3], notes: "Barang sudah diterima lengkap" },
  ],
  [
    { status: "draft", items: [2, 3], notes: "PO tambahan karena banyak expired" },
    { status: "received", items: [3, 4], notes: "Restok untuk ganti stok expired" },
  ],
  [
    { status: "sent", items: [2, 5], notes: "PO mendesak, stok hampir habis" },
    { status: "received", items: [3, 4], notes: "Pengiriman cepat dari supplier" },
    { status: "draft", items: [2, 3], notes: "PO lanjutan minggu depan" },
  ],
  [{ status: "draft", items: [2, 2], notes: "PO pertama, masih menunggu approval" }],
  [
    { status: "sent", items: [3, 3], notes: "PO awal pembukaan cabang" },
    { status: "draft", items: [2, 4], notes: "PO kedua, restok rutin pertama" },
  ],
];

const OPNAME_CONFIG: { status: string; itemsCount: number; notes: string; selisihRange: [number, number] }[][] = [
  [
    { status: "approved", itemsCount: 5, notes: "Opname rutin bulanan — Pusat", selisihRange: [-3, 4] },
    { status: "approved", itemsCount: 4, notes: "Opname akhir kuartal", selisihRange: [-2, 3] },
    { status: "pending_approval", itemsCount: 3, notes: "Opname mingguan, menunggu approve", selisihRange: [-1, 2] },
  ],
  [
    { status: "approved", itemsCount: 4, notes: "Opname bulanan — Bandung", selisihRange: [-5, 2] },
    { status: "pending_approval", itemsCount: 3, notes: "Opname dadakan karena banyak expired", selisihRange: [-4, 1] },
  ],
  [
    { status: "approved", itemsCount: 5, notes: "Opname rutin — Surabaya", selisihRange: [-3, 5] },
    { status: "pending_approval", itemsCount: 4, notes: "Opname karena stok sering habis", selisihRange: [-2, 3] },
    { status: "draft", itemsCount: 3, notes: "Opname dadakan minggu ini", selisihRange: [0, 0] },
  ],
  [{ status: "approved", itemsCount: 3, notes: "Opname bulanan — Yogyakarta", selisihRange: [-1, 1] }],
  [{ status: "pending_approval", itemsCount: 3, notes: "Opname pertama cabang baru", selisihRange: [-2, 2] }],
];

const TRANSFER_SEEDS: {
  from: number;
  to: number;
  status: string;
  notes: string;
  items: { idx: number; qty: number }[];
}[] = [
  { from: 0, to: 3, status: "received", notes: "Transfer tepung ke Yogyakarta karena stok menipis", items: [{ idx: 5, qty: 20 }, { idx: 6, qty: 10 }] },
  { from: 0, to: 4, status: "approved", notes: "Transfer susu ke Semarang untuk order besar", items: [{ idx: 2, qty: 15 }, { idx: 0, qty: 30 }] },
  { from: 1, to: 2, status: "pending", notes: "Bandung kirim mentega ke Surabaya", items: [{ idx: 1, qty: 5 }] },
  { from: 0, to: 1, status: "rejected", notes: "Dibatalkan, stok Bandung sudah cukup", items: [{ idx: 5, qty: 10 }] },
];

const POSITIONS = ["Kepala Dapur", "Staf Produksi", "Quality Control", "Staf Gudang", "Operator Produksi"];

function shuffledIndexes(length: number, rng: Rng): number[] {
  const indexes = Array.from({ length }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes;
}

export function createSeedData(): MockDb {
  const rng = makeRng();
  const nowIso = new Date().toISOString();

  /* ---------------------------------------------------------- branches */
  const branches: BranchRow[] = BRANCH_PROFILES.map((p, i) => ({
    id: i + 1,
    name: p.name,
    address: p.address,
    manager: p.manager,
    created_at: timestampDaysAgo(700 - i * 10, rng),
    updated_at: nowIso,
  }));

  /* ------------------------------------------------------------- users */
  const users: UserRow[] = [];
  users.push({
    id: 1,
    name: "Super Admin",
    email: "admin@mybakery.com",
    password: "password",
    role: "super_admin",
    branch_id: null,
    position: null,
    hire_date: null,
    phone: null,
    created_at: timestampDaysAgo(720, rng),
    updated_at: nowIso,
  });

  let userId = 2;
  branches.forEach((branch, i) => {
    users.push({
      id: userId++,
      name: `Admin ${branch.name}`,
      email: `admin${i + 1}@mybakery.com`,
      password: "password",
      role: "branch_admin",
      branch_id: branch.id,
      position: null,
      hire_date: null,
      phone: null,
      created_at: timestampDaysAgo(700 - i * 10, rng),
      updated_at: nowIso,
    });
    users.push({
      id: userId++,
      name: `Staf ${branch.name}`,
      email: `staf${i + 1}@mybakery.com`,
      password: "password",
      role: "staff",
      branch_id: branch.id,
      position: POSITIONS[i],
      hire_date: dateFromNow(-rng.int(3, 24) * 30),
      phone: `0812-${rng.int(1000, 9999)}-${rng.int(1000, 9999)}`,
      created_at: timestampDaysAgo(700 - i * 10, rng),
      updated_at: nowIso,
    });
  });

  const branchAdmins = users.filter((u) => u.role === "branch_admin");
  const staffUsers = users.filter((u) => u.role === "staff");
  const superAdmin = users[0];

  /* ------------------------------------------------------- categories */
  const categories: CategoryRow[] = CATEGORY_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    created_at: timestampDaysAgo(690, rng),
    updated_at: nowIso,
  }));
  const categoryIdByName = new Map(categories.map((c) => [c.name, c.id]));

  /* ------------------------------------------------------- suppliers */
  const suppliers: SupplierRow[] = SUPPLIER_SEEDS.map((s, i) => ({
    id: i + 1,
    ...s,
    created_at: timestampDaysAgo(680, rng),
    updated_at: nowIso,
  }));

  /* ------------------------------------------------------------ items */
  const items: ItemRow[] = ITEM_SEEDS.map((seed, i) => ({
    id: i + 1,
    name: seed.name,
    barcode: `MYB-${String(i + 1).padStart(5, "0")}`,
    default_supplier_id: seed.defaultSupplierId,
    category_id: categoryIdByName.get(seed.category) ?? 1,
    unit: seed.unit,
    threshold: seed.threshold,
    is_perishable: seed.isPerishable,
    cost_price: seed.costPrice,
    image: null,
    created_at: timestampDaysAgo(680, rng),
    updated_at: nowIso,
  }));
  const itemIdByName = new Map(items.map((i) => [i.name, i.id]));

  /* ---------------------------------------------------------- recipes */
  let recipeItemId = 1;
  const recipes: RecipeRow[] = RECIPE_SEEDS.map((seed, i) => ({
    id: i + 1,
    name: seed.name,
    description: seed.description,
    created_at: timestampDaysAgo(660, rng),
    updated_at: nowIso,
    items: seed.items.map(([itemName, quantity]) => ({
      id: recipeItemId++,
      recipe_id: i + 1,
      item_id: itemIdByName.get(itemName) ?? 1,
      quantity,
    })),
  }));

  /* ---------------------------------------------------- branch stocks */
  const branchStocks: BranchStockRow[] = [];
  let stockId = 1;

  branches.forEach((branch, branchIdx) => {
    const profile = BRANCH_PROFILES[branchIdx];
    items.forEach((item, itemIdx) => {
      const seed = ITEM_SEEDS[itemIdx];
      const baseQty = rng.int(seed.baseQty[0], seed.baseQty[1]);
      let qty = Math.max(1, Math.ceil(baseQty * profile.qtyMultiplier));

      if (profile.lowStock && ["Telur", "Tepung Terigu", "Susu Cair", "Gula Pasir", "Mentega"].includes(item.name)) {
        qty = Math.max(1, Math.ceil(qty * 0.2));
      }

      let expiry: string | null = null;
      if (item.is_perishable) {
        if (rng.chance(profile.expiredRate)) {
          expiry = dateFromNow(-rng.int(1, 14));
        } else {
          expiry = dateFromNow(rng.int(seed.expiryDays[0], seed.expiryDays[1]));
        }
      }

      const storage =
        item.is_perishable
          ? item.name === "Es Krim Vanila"
            ? "freezer"
            : "cold_storage"
          : "pantry";

      const createdAt = timestampDaysAgo(rng.int(1, 200), rng);

      branchStocks.push({
        id: stockId++,
        branch_id: branch.id,
        item_id: item.id,
        quantity: qty,
        storage_location: storage,
        expiry_date: expiry,
        created_at: createdAt,
        updated_at: timestampDaysAgo(rng.int(0, 30), rng),
      });
    });
  });

  /* --------------------------------------------------- stock movements */
  const movements: MovementRow[] = [];
  let movementId = 1;

  branches.forEach((branch, branchIdx) => {
    const profile = BRANCH_PROFILES[branchIdx];
    const staff = staffUsers[branchIdx];

    items.forEach((item, itemIdx) => {
      const seed = ITEM_SEEDS[itemIdx];
      const count = rng.int(profile.movementCount[0], profile.movementCount[1]);

      for (let i = 0; i < count; i++) {
        const type: "in" | "out" = rng.chance(profile.movementRatioIn) ? "in" : "out";
        let qty = rng.int(Math.max(1, Math.ceil(seed.baseQty[0] / 4)), Math.max(2, Math.ceil(seed.baseQty[1] / 2)));
        if (type === "out" && profile.lowStock) qty = Math.ceil(qty * 1.3);

        // Sebagian besar out dalam 30 hari terakhir diberi reason production
        // supaya fitur prediksi (Fase 15) punya data pemakaian nyata.
        const daysAgo = rng.chance(0.03) ? 0 : rng.int(1, 365);
        const withinWindow = daysAgo <= 29;
        let reason: string | null = null;
        if (type === "out") {
          reason = withinWindow && rng.chance(0.55)
            ? "production"
            : rng.pick(LOSS_REASONS);
        }

        const createdAt = timestampDaysAgo(daysAgo, rng);
        movements.push({
          id: movementId++,
          branch_id: branch.id,
          item_id: item.id,
          type,
          quantity: qty,
          note: type === "in" ? rng.pick(IN_NOTES) : rng.pick(OUT_NOTES),
          reason,
          user_id: staff.id,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
    });
  });

  // Paksa sejumlah pemakaian production 30 hari terakhir supaya
  // estimated_days_left bervariasi (ada yang ≤7 hari → kartu "Segera Habis").
  branchStocks.forEach((stock, idx) => {
    if (idx % 3 !== 0) return;
    const quantity = stock.quantity;
    if (quantity <= 0) return;
    const targetDays = rng.pick([2, 3, 4, 5, 6, 7]);
    const totalUsage = (quantity / targetDays) * 30;
    const parts = rng.int(5, 10);
    const staff = staffUsers[stock.branch_id - 1];

    for (let i = 0; i < parts; i++) {
      const createdAt = timestampDaysAgo(rng.int(0, 28), rng);
      movements.push({
        id: movementId++,
        branch_id: stock.branch_id,
        item_id: stock.item_id,
        type: "out",
        quantity: Math.max(1, Math.round((totalUsage / parts) * 100) / 100),
        note: "Pemakaian produksi harian",
        reason: "production",
        user_id: staff.id,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  });

  movements.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  movements.forEach((m, i) => (m.id = i + 1));

  /* -------------------------------------------------- purchase orders */
  const purchaseOrders: PurchaseOrderRow[] = [];
  let poId = 1;
  let poItemId = 1;

  branches.forEach((branch, branchIdx) => {
    const config = POS_CONFIG[branchIdx] ?? [];
    const admin = branchAdmins.find((a) => a.branch_id === branch.id) ?? branchAdmins[0];

    config.forEach((poConfig) => {
      const createdAt = timestampDaysAgo(rng.int(2, 60), rng);
      const chosen = shuffledIndexes(items.length, rng).slice(0, rng.int(poConfig.items[0], poConfig.items[1]));
      const poItems: PurchaseOrderItemRow[] = chosen.map((itemIdx) => ({
        id: poItemId++,
        purchase_order_id: poId,
        item_id: items[itemIdx].id,
        quantity: rng.int(10, 50),
        unit_price: items[itemIdx].cost_price,
      }));

      purchaseOrders.push({
        id: poId++,
        supplier_id: rng.int(1, suppliers.length),
        branch_id: branch.id,
        user_id: admin.id,
        status: poConfig.status,
        notes: poConfig.notes,
        created_at: createdAt,
        updated_at: createdAt,
        items: poItems,
      });
    });
  });

  /* ------------------------------------------------------ stock opname */
  const opnames: OpnameRow[] = [];
  let opnameId = 1;
  let opnameItemId = 1;

  branches.forEach((branch, branchIdx) => {
    const config = OPNAME_CONFIG[branchIdx] ?? [];
    const staff = staffUsers.find((s) => s.branch_id === branch.id);
    const admin = branchAdmins.find((a) => a.branch_id === branch.id);
    const stocks = branchStocks.filter((s) => s.branch_id === branch.id);
    if (!staff || stocks.length === 0) return;

    config.forEach((opnameConfig, opnameIdx) => {
      const createdAt = timestampDaysAgo(rng.int(1, 30), rng);
      const chosen = shuffledIndexes(stocks.length, rng).slice(0, Math.min(opnameConfig.itemsCount, stocks.length));
      const items_: OpnameItemRow[] = chosen.map((stockIdx) => {
        const stock = stocks[stockIdx];
        if (opnameConfig.status === "draft") {
          return {
            id: opnameItemId++,
            stock_opname_id: opnameId,
            item_id: stock.item_id,
            qty_system: stock.quantity,
            qty_fisik: null,
            selisih: null,
          };
        }
        const selisih = rng.int(opnameConfig.selisihRange[0], opnameConfig.selisihRange[1]);
        return {
          id: opnameItemId++,
          stock_opname_id: opnameId,
          item_id: stock.item_id,
          qty_system: stock.quantity,
          qty_fisik: stock.quantity + selisih,
          selisih,
        };
      });

      opnames.push({
        id: opnameId++,
        branch_id: branch.id,
        user_id: staff.id,
        status: opnameConfig.status,
        approved_by: opnameConfig.status === "approved" ? (admin?.id ?? superAdmin.id) : null,
        notes: opnameConfig.notes,
        created_at: createdAt,
        updated_at: createdAt,
        items: items_,
      });

      void opnameIdx;
    });
  });

  /* ---------------------------------------------------- stock transfers */
  const transfers: TransferRow[] = [];
  let transferId = 1;
  let transferItemId = 1;

  TRANSFER_SEEDS.forEach((t) => {
    const fromBranch = branches[t.from];
    const toBranch = branches[t.to];
    const admin = branchAdmins.find((a) => a.branch_id === fromBranch.id) ?? branchAdmins[0];
    const approver = branchAdmins.find((a) => a.branch_id === toBranch.id) ?? superAdmin;
    const createdAt = timestampDaysAgo(rng.int(1, 45), rng);

    transfers.push({
      id: transferId++,
      from_branch_id: fromBranch.id,
      to_branch_id: toBranch.id,
      user_id: admin.id,
      approved_by: ["approved", "received"].includes(t.status) ? approver.id : null,
      status: t.status,
      notes: t.notes,
      created_at: createdAt,
      updated_at: createdAt,
      items: t.items.map((ti) => ({
        id: transferItemId++,
        stock_transfer_id: transferId - 1,
        item_id: items[ti.idx].id,
        quantity: ti.qty,
      })),
    });
  });

  /* ------------------------------------------------------ stock batches */
  const batches: BatchRow[] = [];
  let batchId = 1;
  branches.forEach((branch, branchIdx) => {
    for (let i = 0; i < 2; i++) {
      const itemIdx = rng.int(0, items.length - 1);
      const item = items[itemIdx];
      const expiry = item.is_perishable ? dateFromNow(rng.int(3, 40)) : dateFromNow(rng.int(60, 200));
      const productionDate = dateFromNow(-rng.int(1, 12));
      const createdAt = timestampDaysAgo(rng.int(1, 12), rng);
      batches.push({
        id: batchId++,
        branch_id: branch.id,
        item_id: item.id,
        batch_code: `BT-${branchIdx + 1}${String(batchId).padStart(4, "0")}`,
        quantity: rng.int(5, 40),
        production_date: productionDate,
        expiry_date: expiry,
        storage_location: item.is_perishable ? (item.name === "Es Krim Vanila" ? "freezer" : "cold_storage") : "pantry",
        cost_price: item.cost_price,
        status: "active",
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  });

  /* -------------------------------------------------- production logs */
  const productionLogs: ProductionLogRow[] = [];
  let productionLogId = 1;
  let productionLogItemId = 1;
  branches.forEach((branch, branchIdx) => {
    const recipe = recipes[branchIdx % recipes.length];
    const staff = staffUsers[branchIdx];
    const createdAt = timestampDaysAgo(rng.int(1, 20), rng);
    const producedAt = dateFromNow(-rng.int(1, 20));
    const quantity = rng.int(2, 8);
    productionLogs.push({
      id: productionLogId++,
      branch_id: branch.id,
      recipe_id: recipe.id,
      user_id: staff.id,
      quantity,
      produced_at: producedAt,
      notes: "Produksi harian",
      created_at: createdAt,
      updated_at: createdAt,
      items: recipe.items.map((ri) => ({
        id: productionLogItemId++,
        production_log_id: productionLogId - 1,
        item_id: ri.item_id,
        quantity_used: Math.round(ri.quantity * quantity * 100) / 100,
      })),
    });
  });

  /* --------------------------------------------------- activity logs */
  const activityLogs: ActivityLogRow[] = [];
  let activityId = 1;
  const pushLog = (
    user_id: number,
    action: string,
    subject_type: string | null,
    subject_id: number | null,
    data: Record<string, unknown> | null,
    daysAgo: number
  ) => {
    const createdAt = timestampDaysAgo(daysAgo, rng);
    activityLogs.push({
      id: activityId++,
      user_id,
      action,
      subject_type,
      subject_id,
      data,
      created_at: createdAt,
      updated_at: createdAt,
    });
  };

  opnames.forEach((opname) => {
    const action =
      opname.status === "approved"
        ? "stock_opname_approved"
        : opname.status === "pending_approval"
          ? "stock_opname_submitted"
          : "stock_opname_created";
    pushLog(
      opname.approved_by ?? opname.user_id,
      action,
      "App\\Models\\StockOpname",
      opname.id,
      { branch_id: opname.branch_id },
      rng.int(1, 14)
    );
  });

  purchaseOrders.forEach((po) => {
    pushLog(po.user_id, "po_created", "App\\Models\\PurchaseOrder", po.id, {
      supplier: suppliers[po.supplier_id - 1]?.name ?? "",
      branch: branches[po.branch_id - 1]?.name ?? "",
      total: po.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0),
    }, rng.int(2, 60));
    if (po.status !== "draft") {
      pushLog(superAdmin.id, "po_status_updated", "App\\Models\\PurchaseOrder", po.id, {
        old_status: "draft",
        new_status: po.status,
      }, rng.int(1, 30));
    }
  });

  transfers.forEach((t) => {
    pushLog(t.user_id, "transfer_created", "App\\Models\\StockTransfer", t.id, {
      from: branches[t.from_branch_id - 1]?.name ?? "",
      to: branches[t.to_branch_id - 1]?.name ?? "",
      items_count: t.items.length,
    }, rng.int(1, 45));
  });

  recipes.forEach((recipe) => {
    pushLog(branchAdmins[0].id, "recipe_created", "App\\Models\\Recipe", recipe.id, {
      name: recipe.name,
      items_count: recipe.items.length,
    }, rng.int(100, 600));
  });

  items.forEach((item) => {
    pushLog(branchAdmins[0].id, "item_created", "App\\Models\\Item", item.id, {
      name: item.name,
      category: categories.find((c) => c.id === item.category_id)?.name ?? "",
    }, rng.int(200, 650));
  });

  suppliers.forEach((supplier) => {
    pushLog(superAdmin.id, "supplier_created", "App\\Models\\Supplier", supplier.id, {
      name: supplier.name,
    }, rng.int(200, 650));
  });

  productionLogs.forEach((log) => {
    pushLog(log.user_id, "production_recorded", "App\\Models\\ProductionLog", log.id, {
      branch_id: log.branch_id,
      recipe_id: log.recipe_id,
      recipe_name: recipes.find((r) => r.id === log.recipe_id)?.name ?? "",
      quantity: log.quantity,
      items_count: log.items.length,
    }, rng.int(1, 20));
  });

  activityLogs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  activityLogs.forEach((log, i) => (log.id = i + 1));

  /* ---------------------------------------------------- notifications */
  const notifications: NotificationRow[] = [];
  let notificationId = 1;

  const pushNotification = (
    user_id: number,
    type: string,
    title: string,
    message: string,
    data: Record<string, unknown>,
    daysAgo: number,
    read = false
  ) => {
    const createdAt = timestampDaysAgo(daysAgo, rng);
    notifications.push({
      id: notificationId++,
      user_id,
      type,
      title,
      message,
      data,
      read_at: read ? timestampDaysAgo(Math.max(0, daysAgo - 1), rng) : null,
      created_at: createdAt,
    });
  };

  const statusOf = (stock: BranchStockRow): string => {
    if (stock.quantity <= 0) return "out_of_stock";
    if (stock.expiry_date && stock.expiry_date <= dateFromNow(0)) return "expired";
    const item = items.find((i) => i.id === stock.item_id);
    if (stock.quantity <= (item?.threshold ?? 0)) return "low_stock";
    return "good";
  };

  const lowStocks = branchStocks.filter((s) => statusOf(s) === "low_stock");
  lowStocks.forEach((stock) => {
    const item = items.find((i) => i.id === stock.item_id)!;
    const branch = branches.find((b) => b.id === stock.branch_id)!;
    const admin = branchAdmins.find((a) => a.branch_id === stock.branch_id);
    const recipients = admin ? [admin, superAdmin] : [superAdmin];
    recipients.forEach((recipient, i) => {
      pushNotification(
        recipient.id,
        "low_stock",
        "Stok Menipis",
        `${item.name} di ${branch.name} tersisa ${stock.quantity} ${item.unit} (threshold: ${item.threshold})`,
        { item_id: item.id, branch_id: branch.id, quantity: stock.quantity, threshold: item.threshold },
        rng.int(0, 10),
        i === 1
      );
    });
  });

  const expiring = branchStocks.filter(
    (s) =>
      s.quantity > 0 &&
      s.expiry_date !== null &&
      s.expiry_date > dateFromNow(0) &&
      s.expiry_date <= dateFromNow(7)
  );
  expiring.forEach((stock) => {
    const item = items.find((i) => i.id === stock.item_id)!;
    const branch = branches.find((b) => b.id === stock.branch_id)!;
    const admin = branchAdmins.find((a) => a.branch_id === stock.branch_id);
    const recipients = admin ? [admin, superAdmin] : [superAdmin];
    recipients.forEach((recipient, i) => {
      pushNotification(
        recipient.id,
        "expiry",
        "Stok Akan Kadaluarsa",
        `${item.name} di ${branch.name} akan kadaluarsa dalam 7 hari (${stock.quantity} ${item.unit})`,
        { item_id: item.id, branch_id: branch.id, quantity: stock.quantity, expiry_date: stock.expiry_date },
        rng.int(0, 5),
        i === 1
      );
    });
  });

  notifications.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  notifications.forEach((n, i) => (n.id = i + 1));

  return {
    branches,
    users,
    categories,
    items,
    suppliers,
    recipes,
    branchStocks,
    movements,
    purchaseOrders,
    opnames,
    transfers,
    batches,
    productionLogs,
    activityLogs,
    notifications,
  };
}

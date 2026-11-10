/**
 * Serializer — mereplikasi bentuk JSON API Resource Laravel.
 *
 * Aturan wrapping (lihat `backend/app/Http/Resources/*`):
 * - Resource tunggal & koleksi non-paginated dibungkus key `data`.
 * - Koleksi paginated dibungkus `{ data, links, meta }`.
 * - Beberapa endpoint mengembalikan objek eksplisit (mis. `response()->json([...])`)
 *   dan TIDAK dibungkus — ditangani langsung di router.
 */

import type {
  ActivityLogRow,
  BatchRow,
  BranchRow,
  BranchStockRow,
  CategoryRow,
  ItemRow,
  MockDb,
  MovementRow,
  NotificationRow,
  OpnameRow,
  ProductionLogRow,
  PurchaseOrderRow,
  RecipeRow,
  SupplierRow,
  TransferRow,
  UserRow,
} from "./seed";
import { dateFromNow } from "./random";

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  branch_admin: "Admin Cabang",
  staff: "Staf",
};

/** Prioritas sama dengan `BranchStock::getStatusAttribute()`. */
export function stockStatus(quantity: number, expiryDate: string | null, threshold: number): string {
  if (quantity <= 0) return "out_of_stock";
  if (expiryDate && expiryDate <= dateFromNow(0)) return "expired";
  if (quantity <= threshold) return "low_stock";
  return "good";
}

export function branchResource(branch: BranchRow) {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    manager: branch.manager,
    created_at: branch.created_at,
    updated_at: branch.updated_at,
  };
}

export function userResource(user: UserRow, db: MockDb) {
  const branch = user.branch_id ? db.branches.find((b) => b.id === user.branch_id) : undefined;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    branch: branch ? branchResource(branch) : null,
    position: user.position,
    hire_date: user.hire_date,
    phone: user.phone,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function categoryResource(category: CategoryRow, itemsCount?: number) {
  return {
    id: category.id,
    name: category.name,
    ...(itemsCount !== undefined ? { items_count: itemsCount } : {}),
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
}

export function itemResource(item: ItemRow, db: MockDb, isSuperAdmin: boolean) {
  const category = db.categories.find((c) => c.id === item.category_id);
  return {
    id: item.id,
    name: item.name,
    barcode: item.barcode,
    default_supplier_id: item.default_supplier_id,
    category_id: item.category_id,
    category: category ? categoryResource(category) : undefined,
    unit: item.unit,
    threshold: item.threshold,
    is_perishable: item.is_perishable,
    ...(isSuperAdmin ? { cost_price: item.cost_price } : {}),
    image: item.image,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

export function supplierResource(supplier: SupplierRow) {
  return {
    id: supplier.id,
    name: supplier.name,
    contact_person: supplier.contact_person,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    lead_time_days: supplier.lead_time_days,
    created_at: supplier.created_at,
    updated_at: supplier.updated_at,
  };
}

export function recipeResource(recipe: RecipeRow, db: MockDb, isSuperAdmin: boolean) {
  const items = recipe.items.map((ri) => {
    const item = db.items.find((i) => i.id === ri.item_id);
    return {
      id: ri.id,
      item_id: ri.item_id,
      item: item ? itemResource(item, db, isSuperAdmin) : undefined,
      quantity: ri.quantity,
      ...(isSuperAdmin ? { subtotal: ri.quantity * (item?.cost_price ?? 0) } : {}),
    };
  });

  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    items,
    ...(isSuperAdmin ? { hpp: recipeHpp(recipe, db) } : {}),
    created_at: recipe.created_at,
    updated_at: recipe.updated_at,
  };
}

export function recipeHpp(recipe: RecipeRow, db: MockDb): number {
  return recipe.items.reduce((sum, ri) => {
    const item = db.items.find((i) => i.id === ri.item_id);
    return sum + ri.quantity * (item?.cost_price ?? 0);
  }, 0);
}

export function branchStockResource(
  stock: BranchStockRow,
  db: MockDb,
  isSuperAdmin: boolean,
  options: { item?: boolean; branch?: boolean } = { item: true, branch: true }
) {
  const item = options.item ? db.items.find((i) => i.id === stock.item_id) : undefined;
  const branch = options.branch ? db.branches.find((b) => b.id === stock.branch_id) : undefined;
  const threshold = item?.threshold ?? 0;

  return {
    id: stock.id,
    branch_id: stock.branch_id,
    item_id: stock.item_id,
    quantity: stock.quantity,
    storage_location: stock.storage_location,
    expiry_date: stock.expiry_date,
    status: stockStatus(stock.quantity, stock.expiry_date, threshold),
    ...(options.item && item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
    ...(options.branch && branch ? { branch: branchResource(branch) } : {}),
    created_at: stock.created_at,
    updated_at: stock.updated_at,
  };
}

export function movementResource(movement: MovementRow, db: MockDb, isSuperAdmin: boolean) {
  const item = db.items.find((i) => i.id === movement.item_id);
  const branch = db.branches.find((b) => b.id === movement.branch_id);
  const user = db.users.find((u) => u.id === movement.user_id);

  return {
    id: movement.id,
    branch_id: movement.branch_id,
    item_id: movement.item_id,
    type: movement.type,
    quantity: movement.quantity,
    note: movement.note,
    reason: movement.reason,
    user_id: movement.user_id,
    ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
    ...(branch ? { branch: branchResource(branch) } : {}),
    ...(user ? { user: userResource(user, db) } : {}),
    created_at: movement.created_at,
    updated_at: movement.updated_at,
  };
}

export function purchaseOrderResource(po: PurchaseOrderRow, db: MockDb, isSuperAdmin: boolean) {
  const supplier = db.suppliers.find((s) => s.id === po.supplier_id);
  const branch = db.branches.find((b) => b.id === po.branch_id);
  const user = db.users.find((u) => u.id === po.user_id);

  return {
    id: po.id,
    supplier_id: po.supplier_id,
    branch_id: po.branch_id,
    user_id: po.user_id,
    status: po.status,
    notes: po.notes,
    total: po.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0),
    ...(supplier ? { supplier: supplierResource(supplier) } : {}),
    ...(branch ? { branch: branchResource(branch) } : {}),
    ...(user ? { user: userResource(user, db) } : {}),
    items: po.items.map((it) => {
      const item = db.items.find((i) => i.id === it.item_id);
      return {
        id: it.id,
        purchase_order_id: it.purchase_order_id,
        item_id: it.item_id,
        quantity: it.quantity,
        unit_price: it.unit_price,
        subtotal: it.quantity * it.unit_price,
        ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
        created_at: po.created_at,
        updated_at: po.updated_at,
      };
    }),
    created_at: po.created_at,
    updated_at: po.updated_at,
  };
}

export function opnameResource(opname: OpnameRow, db: MockDb, isSuperAdmin: boolean) {
  const branch = db.branches.find((b) => b.id === opname.branch_id);
  const user = db.users.find((u) => u.id === opname.user_id);
  const approver = opname.approved_by ? db.users.find((u) => u.id === opname.approved_by) : undefined;

  const items = opname.items.map((it) => {
    const item = db.items.find((i) => i.id === it.item_id);
    return {
      id: it.id,
      stock_opname_id: it.stock_opname_id,
      item_id: it.item_id,
      qty_system: it.qty_system,
      qty_fisik: it.qty_fisik,
      selisih: it.selisih,
      ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
      created_at: opname.created_at,
      updated_at: opname.updated_at,
    };
  });

  return {
    id: opname.id,
    branch_id: opname.branch_id,
    user_id: opname.user_id,
    status: opname.status,
    approved_by: opname.approved_by,
    notes: opname.notes,
    ...(branch ? { branch: branchResource(branch) } : {}),
    ...(user ? { user: userResource(user, db) } : {}),
    ...(approver ? { approver: userResource(approver, db) } : {}),
    items,
    has_discrepancy: items.length ? items.some((i) => (i.selisih ?? 0) !== 0) : null,
    created_at: opname.created_at,
    updated_at: opname.updated_at,
  };
}

export function transferResource(transfer: TransferRow, db: MockDb, isSuperAdmin: boolean) {
  const fromBranch = db.branches.find((b) => b.id === transfer.from_branch_id);
  const toBranch = db.branches.find((b) => b.id === transfer.to_branch_id);
  const user = db.users.find((u) => u.id === transfer.user_id);
  const approver = transfer.approved_by ? db.users.find((u) => u.id === transfer.approved_by) : undefined;

  const format = (iso: string) => iso.replace("T", " ").slice(0, 16);

  return {
    id: transfer.id,
    from_branch_id: transfer.from_branch_id,
    to_branch_id: transfer.to_branch_id,
    user_id: transfer.user_id,
    approved_by: transfer.approved_by,
    status: transfer.status,
    notes: transfer.notes,
    ...(fromBranch ? { from_branch: branchResource(fromBranch) } : {}),
    ...(toBranch ? { to_branch: branchResource(toBranch) } : {}),
    ...(user ? { user: userResource(user, db) } : {}),
    ...(approver ? { approver: userResource(approver, db) } : {}),
    items: transfer.items.map((it) => {
      const item = db.items.find((i) => i.id === it.item_id);
      return {
        id: it.id,
        stock_transfer_id: it.stock_transfer_id,
        item_id: it.item_id,
        quantity: it.quantity,
        ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
      };
    }),
    created_at: format(transfer.created_at),
    updated_at: format(transfer.updated_at),
  };
}

export function batchResource(batch: BatchRow, db: MockDb, isSuperAdmin: boolean) {
  const item = db.items.find((i) => i.id === batch.item_id);
  const branch = db.branches.find((b) => b.id === batch.branch_id);
  return {
    id: batch.id,
    branch_id: batch.branch_id,
    item_id: batch.item_id,
    batch_code: batch.batch_code,
    quantity: batch.quantity,
    production_date: batch.production_date,
    expiry_date: batch.expiry_date,
    storage_location: batch.storage_location,
    cost_price: batch.cost_price,
    status: batch.status,
    ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
    ...(branch ? { branch: branchResource(branch) } : {}),
    created_at: batch.created_at,
    updated_at: batch.updated_at,
  };
}

export function productionLogResource(log: ProductionLogRow, db: MockDb, isSuperAdmin: boolean) {
  const branch = db.branches.find((b) => b.id === log.branch_id);
  const recipe = db.recipes.find((r) => r.id === log.recipe_id);
  const user = db.users.find((u) => u.id === log.user_id);

  return {
    id: log.id,
    branch_id: log.branch_id,
    recipe_id: log.recipe_id,
    user_id: log.user_id,
    quantity: log.quantity,
    produced_at: log.produced_at,
    notes: log.notes,
    ...(branch ? { branch: branchResource(branch) } : {}),
    ...(recipe ? { recipe: recipeResource(recipe, db, isSuperAdmin) } : {}),
    ...(user ? { user: userResource(user, db) } : {}),
    items: log.items.map((it) => {
      const item = db.items.find((i) => i.id === it.item_id);
      return {
        id: it.id,
        production_log_id: it.production_log_id,
        item_id: it.item_id,
        quantity_used: it.quantity_used,
        ...(item ? { item: itemResource(item, db, isSuperAdmin) } : {}),
      };
    }),
    created_at: log.created_at,
    updated_at: log.updated_at,
  };
}

export function notificationResource(notification: NotificationRow) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data,
    is_read: notification.read_at !== null,
    read_at: notification.read_at ? notification.read_at.replace("T", " ").slice(0, 16) : null,
    created_at: notification.created_at.replace("T", " ").slice(0, 16),
  };
}

export function activityLogResource(log: ActivityLogRow, db: MockDb, isSuperAdmin: boolean) {
  const user = db.users.find((u) => u.id === log.user_id);
  return {
    id: log.id,
    user_id: log.user_id,
    action: log.action,
    subject_type: log.subject_type,
    subject_id: log.subject_id,
    data: log.data,
    ...(user ? { user: userResource(user, db) } : {}),
    created_at: log.created_at,
    updated_at: log.updated_at,
  };
}

/** Bentuk `Illuminate\Pagination\LengthAwarePaginator` (per_page selalu 20). */
export function paginate<T>(rows: T[], page: number, perPage = 20) {
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const data = rows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(total, currentPage * perPage);

  return {
    data,
    links: {
      first: `?page=1`,
      last: `?page=${lastPage}`,
      prev: currentPage > 1 ? `?page=${currentPage - 1}` : null,
      next: currentPage < lastPage ? `?page=${currentPage + 1}` : null,
    },
    meta: {
      current_page: currentPage,
      from,
      last_page: lastPage,
      links: [] as unknown[],
      path: "",
      per_page: perPage,
      to,
      total,
    },
  };
}

/** Koleksi non-paginated: hanya `{ data }`. */
export function collection<T>(rows: T[]) {
  return { data: rows };
}

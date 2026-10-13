export type UserRole = "super_admin" | "branch_admin" | "staff";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  branch_id: number | null;
  branch?: Branch;
  position?: string;
  hire_date?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  manager: string;
  created_at: string;
  updated_at: string;
}

export type ItemStatus = "good" | "low_stock" | "expired" | "out_of_stock";

export interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  name: string;
  barcode: string | null;
  default_supplier_id: number | null;
  category_id: number;
  unit: string;
  threshold: number;
  is_perishable: boolean;
  cost_price?: number;
  image?: string | null;
  category?: Category;
  default_supplier?: Supplier;
  created_at: string;
  updated_at: string;
}

export interface BranchStock {
  id: number;
  item_id: number;
  branch_id: number;
  quantity: number;
  storage_location: string;
  expiry_date: string | null;
  item?: Item;
  branch?: Branch;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  item_id: number;
  branch_id: number;
  type: "in" | "out";
  quantity: number;
  note: string;
  reason: "expired" | "damaged" | "return" | "transfer" | "opname" | "other" | "production" | null;
  user_id: number;
  item?: Item;
  branch?: Branch;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_items: number;
  low_stock: number;
  expired: number;
  out_of_stock: number;
}

export interface Supplier {
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

export interface RecipeItem {
  id: number;
  item_id: number;
  item?: Item;
  quantity: number;
  subtotal?: number;
}

export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  items: RecipeItem[];
  hpp?: number;
  created_at: string;
  updated_at: string;
}

export interface HppItem {
  item_id: number;
  item_name: string;
  unit: string;
  quantity: number;
  cost_price: number;
  subtotal: number;
}

export interface HppDetail {
  id: number;
  name: string;
  description: string | null;
  items: HppItem[];
  total_hpp: number;
}

export interface LossReportItem {
  item_id: number;
  item_name: string;
  unit: string;
  cost_price: number;
  total_quantity: number;
  total_loss: number;
  movements_count: number;
}

export type StockOpnameStatus = "draft" | "pending_approval" | "approved";

export interface StockOpnameItem {
  id: number;
  stock_opname_id: number;
  item_id: number;
  qty_system: number;
  qty_fisik: number | null;
  selisih: number | null;
  item?: Item;
  created_at: string;
  updated_at: string;
}

export interface StockOpname {
  id: number;
  branch_id: number;
  user_id: number;
  status: StockOpnameStatus;
  approved_by: number | null;
  notes: string | null;
  branch?: Branch;
  user?: User;
  approver?: User;
  items: StockOpnameItem[];
  has_discrepancy: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  data: Record<string, unknown> | null;
  user?: User;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = "draft" | "sent" | "received";

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  item?: Item;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  branch_id: number;
  user_id: number;
  status: PurchaseOrderStatus;
  notes: string | null;
  total: number;
  supplier?: Supplier;
  branch?: Branch;
  user?: User;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export type StockTransferStatus = "pending" | "approved" | "received" | "rejected";

export interface StockBatch {
  id: number;
  branch_id: number;
  item_id: number;
  batch_code: string;
  quantity: number;
  production_date: string;
  expiry_date: string | null;
  storage_location: string;
  cost_price: number;
  status: "active" | "depleted" | "expired" | "disposed";
  item?: Item;
  branch?: Branch;
  created_at: string;
  updated_at: string;
}

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  item_id: number;
  quantity: number;
  item?: Item;
}

export interface StockTransfer {
  id: number;
  from_branch_id: number;
  to_branch_id: number;
  user_id: number;
  approved_by: number | null;
  status: StockTransferStatus;
  notes: string | null;
  from_branch?: Branch;
  to_branch?: Branch;
  user?: User;
  approver?: User;
  items: StockTransferItem[];
  created_at: string;
  updated_at: string;
}

export interface ProductionLogItem {
  id: number;
  production_log_id: number;
  item_id: number;
  quantity_used: number;
  item?: Item;
}

export interface ProductionLog {
  id: number;
  branch_id: number;
  recipe_id: number;
  user_id: number;
  quantity: number;
  produced_at: string;
  notes: string | null;
  branch?: Branch;
  recipe?: Recipe;
  user?: User;
  items: ProductionLogItem[];
  created_at: string;
  updated_at: string;
}

export interface StockPrediction {
  item_id: number;
  item_name: string;
  unit: string;
  branch_id: number;
  branch_name: string;
  quantity: number;
  avg_daily_usage: number | null;
  estimated_days_left: number | null;
  lead_time_days: number;
  safety_days: number;
  reorder_point: number | null;
  needs_reorder: boolean;
  suggested_quantity: number | null;
  default_supplier_id: number | null;
  default_supplier_name: string | null;
}

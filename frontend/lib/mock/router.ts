/**
 * Router mock API — mereplikasi `backend/routes/api.php` beserta bentuk
 * response tiap controller (wrapped/flat/paginated/CSV/error).
 *
 * Dipanggil dari `app/api/[...path]/route.ts`.
 */

import {
  clearSessionCookie,
  createSessionCookie,
  csrfCookie,
  getDb,
  newId,
  notifyLowStock,
  pushActivityLog,
  readSessionUserId,
} from "./db";
import {
  activityLogResource,
  batchResource,
  branchResource,
  branchStockResource,
  categoryResource,
  collection,
  itemResource,
  movementResource,
  notificationResource,
  opnameResource,
  paginate,
  productionLogResource,
  purchaseOrderResource,
  recipeHpp,
  recipeResource,
  stockStatus,
  supplierResource,
  transferResource,
  userResource,
} from "./serialize";
import { dateFromNow, makeRng, timestampDaysAgo } from "./random";
import type { MockDb, MovementRow, UserRow } from "./seed";

/* ------------------------------------------------------------------ http */

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

const unauthorized = () => json({ message: "Unauthenticated." }, 401);
const forbidden = (message = "This action is unauthorized.") => json({ message }, 403);
const notFound = (message = "Not found.") => json({ message }, 404);
const unprocessable = (field: string, message: string): Response =>
  json({ message, errors: { [field]: [{ message }] } }, 422);
const unprocessableMessage = (message: string): Response => json({ message }, 422);

function csvResponse(rows: (string | number)[][], filename: string): Response {
  const escape = (value: string | number): string => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=UTF-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

type Body = Record<string, unknown>;

async function readBody(request: Request): Promise<Body> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data") || contentType.includes("x-www-form-urlencoded")) {
      const form = await request.formData();
      const body: Body = {};
      form.forEach((value, key) => {
        if (typeof value === "string") body[key] = value;
      });
      return body;
    }
    const parsed = await request.json();
    return parsed && typeof parsed === "object" ? (parsed as Body) : {};
  } catch {
    return {};
  }
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function pageParam(params: URLSearchParams): number {
  const page = Number(params.get("page") ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

/* ------------------------------------------------------------ permissions */

const isSuperAdmin = (user: UserRow) => user.role === "super_admin";
const isBranchAdmin = (user: UserRow) => user.role === "branch_admin";
const isAdminPlus = (user: UserRow) => user.role === "super_admin" || user.role === "branch_admin";

/* ---------------------------------------------------------------- router */

interface Ctx {
  db: MockDb;
  user: UserRow;
  isSuperAdmin: boolean;
  params: URLSearchParams;
}

export async function handleMockApi(request: Request, segments: string[]): Promise<Response> {
  const db = getDb();
  const url = new URL(request.url);
  const params = url.searchParams;
  const method = request.method.toUpperCase();
  const path = segments.map(decodeURIComponent);

  /* ---------------------------------------------------------- auth flow */

  if (path[0] === "ping") {
    return json({ message: "pong" });
  }

  if (path[0] === "login" && method === "POST") {
    const body = await readBody(request);
    const email = asString(body.email);
    const password = asString(body.password);
    const user = db.users.find((u) => u.email === email);

    if (!email || !password || !user || user.password !== password) {
      return json({ message: "Invalid credentials" }, 401);
    }
    return json(
      { user: userResource(user, db), message: "Login successful" },
      200,
      { "Set-Cookie": createSessionCookie(user.id) }
    );
  }

  if (path[0] === "logout" && method === "POST") {
    return json({ message: "Logged out" }, 200, { "Set-Cookie": clearSessionCookie() });
  }

  if (path[0] === "register" && method === "POST") {
    const body = await readBody(request);
    const name = asString(body.name);
    const email = asString(body.email);
    const password = asString(body.password);
    if (!name || !email || !password) {
      return unprocessable("email", "The email field is required.");
    }
    if (db.users.some((u) => u.email === email)) {
      return unprocessable("email", "The email has already been taken.");
    }
    const user: UserRow = {
      id: newId(db.users),
      name,
      email,
      password,
      role: (asString(body.role) as UserRow["role"]) ?? "staff",
      branch_id: asNumber(body.branch_id),
      position: null,
      hire_date: null,
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(user);
    return json(
      { user: userResource(user, db), message: "Registration successful" },
      201,
      { "Set-Cookie": createSessionCookie(user.id) }
    );
  }

  // Semua endpoint berikutnya butuh sesi.
  const userId = readSessionUserId(request);
  const user = userId !== null ? db.users.find((u) => u.id === userId) : undefined;
  if (!user) return unauthorized();

  const ctx: Ctx = { db, user, isSuperAdmin: isSuperAdmin(user), params };

  try {
    return route(request, method, path, ctx, await readBody(request));
  } catch (error) {
    console.error("[mock-api] handler error", error);
    return json({ message: "Internal server error" }, 500);
  }
}

function route(
  request: Request,
  method: string,
  path: string[],
  ctx: Ctx,
  body: Body
): Response {
  const { db, user, isSuperAdmin: superAdmin, params } = ctx;
  const head = path[0];
  const id = path[1] ? Number(path[1]) : null;
  const action = path[2] ?? null;

  /* ------------------------------------------------------------- /user */

  if (head === "user") {
    if (path.length === 1 && method === "GET") return json(userResource(user, db));

    if (path[1] === "profile" && method === "PUT") {
      const name = asString(body.name);
      const phone = asString(body.phone);
      if (name) user.name = name;
      if (phone !== undefined && phone !== null) user.phone = phone;
      user.updated_at = new Date().toISOString();
      return json(userResource(user, db));
    }
    return notFound();
  }

  /* --------------------------------------------------------- /branches */

  if (head === "branches") {
    if (method === "GET" && path.length === 1) {
      const rows = superAdmin
        ? db.branches
        : db.branches.filter((b) => b.id === user.branch_id);
      return json(collection(rows.map(branchResource)));
    }
    if (method === "GET" && id !== null) {
      const branch = db.branches.find((b) => b.id === id);
      if (!branch) return notFound("Branch not found");
      return json({ data: branchResource(branch) });
    }
    if (method === "POST") {
      if (!superAdmin) return forbidden();
      const name = asString(body.name);
      if (!name) return unprocessable("name", "The name field is required.");
      const now = new Date().toISOString();
      const branch = {
        id: newId(db.branches),
        name,
        address: asString(body.address) ?? "",
        manager: asString(body.manager) ?? "",
        created_at: now,
        updated_at: now,
      };
      db.branches.push(branch);
      return json({ data: branchResource(branch) }, 201);
    }
    if (method === "PUT" && id !== null) {
      if (!superAdmin) return forbidden();
      const branch = db.branches.find((b) => b.id === id);
      if (!branch) return notFound("Branch not found");
      const name = asString(body.name);
      if (name) branch.name = name;
      const address = asString(body.address);
      if (address !== null) branch.address = address;
      const manager = asString(body.manager);
      if (manager !== null) branch.manager = manager;
      branch.updated_at = new Date().toISOString();
      return json({ data: branchResource(branch) });
    }
    if (method === "DELETE" && id !== null) {
      if (!superAdmin) return forbidden();
      const branch = db.branches.find((b) => b.id === id);
      if (!branch) return notFound("Branch not found");
      db.branches.splice(db.branches.indexOf(branch), 1);
      return json({ message: "Branch deleted" });
    }
    return notFound();
  }

  /* ------------------------------------------------------- /categories */

  if (head === "categories") {
    const ordered = [...db.categories].sort((a, b) => a.name.localeCompare(b.name));

    if (method === "GET" && path.length === 1) {
      const rows = ordered.map((category) =>
        categoryResource(category, db.items.filter((i) => i.category_id === category.id).length)
      );
      return json(paginate(rows, pageParam(params)));
    }
    if (method === "GET" && id !== null && !action) {
      const category = db.categories.find((c) => c.id === id);
      if (!category) return notFound("Category not found");
      return json({
        data: categoryResource(
          category,
          db.items.filter((i) => i.category_id === category.id).length
        ),
      });
    }
    if (method === "POST") {
      if (!isAdminPlus(user)) return forbidden();
      const name = asString(body.name);
      if (!name) return unprocessable("name", "The name field is required.");
      if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return unprocessable("name", "The name has already been taken.");
      }
      const now = new Date().toISOString();
      const category = { id: newId(db.categories), name, created_at: now, updated_at: now };
      db.categories.push(category);
      pushActivityLog(db, user.id, "category_created", "App\\Models\\Category", category.id, {
        name: category.name,
      });
      return json({ data: categoryResource(category, 0) }, 201);
    }
    if (method === "PUT" && id !== null) {
      if (!isAdminPlus(user)) return forbidden();
      const category = db.categories.find((c) => c.id === id);
      if (!category) return notFound("Category not found");
      const name = asString(body.name);
      if (!name) return unprocessable("name", "The name field is required.");
      category.name = name;
      category.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "category_updated", "App\\Models\\Category", category.id, {
        name,
      });
      return json({ data: categoryResource(category) });
    }
    if (method === "DELETE" && id !== null) {
      if (!superAdmin) return forbidden();
      const category = db.categories.find((c) => c.id === id);
      if (!category) return notFound("Category not found");
      if (db.items.some((i) => i.category_id === id)) {
        return unprocessableMessage("Kategori tidak dapat dihapus karena masih digunakan oleh item");
      }
      db.categories.splice(db.categories.indexOf(category), 1);
      pushActivityLog(db, user.id, "category_deleted", "App\\Models\\Category", category.id, {
        name: category.name,
      });
      return json({ message: "Category deleted" });
    }
    return notFound();
  }

  /* ------------------------------------------------------------ /items */

  if (head === "items") {
    if (method === "GET" && path[1] === "scan" && path[2]) {
      const barcode = path[2];
      const item = db.items.find((i) => i.barcode === barcode);
      if (!item) return json({ message: "Item tidak ditemukan" }, 404);
      const stocks = db.branchStocks
        .filter((s) => s.item_id === item.id)
        .map((s) => branchStockResource(s, db, superAdmin));
      return json({ item: itemResource(item, db, superAdmin), stocks });
    }

    if (method === "GET" && path.length === 1) {
      const categoryId = asNumber(params.get("category_id"));
      const rows = db.items
        .filter((item) => categoryId === null || item.category_id === categoryId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => itemResource(item, db, superAdmin));
      return json(paginate(rows, pageParam(params)));
    }

    if (method === "GET" && id !== null) {
      const item = db.items.find((i) => i.id === id);
      if (!item) return notFound("Item not found");
      return json({ data: itemResource(item, db, superAdmin) });
    }

    if (method === "POST" && path.length === 1) {
      if (!isAdminPlus(user)) return forbidden();
      const result = createItem(db, body, superAdmin);
      if (result instanceof Response) return result;
      pushActivityLog(db, user.id, "item_created", "App\\Models\\Item", result.id, {
        name: result.name,
        category: db.categories.find((c) => c.id === result.category_id)?.name ?? "",
      });
      return json({ data: itemResource(result, db, superAdmin) }, 201);
    }

    if (method === "POST" && id !== null) {
      // FE mengirim multipart dengan `_method=PUT`.
      if (!isAdminPlus(user)) return forbidden();
      const item = db.items.find((i) => i.id === id);
      if (!item) return notFound("Item not found");
      const result = updateItem(db, item, body, superAdmin);
      if (result instanceof Response) return result;
      pushActivityLog(db, user.id, "item_updated", "App\\Models\\Item", item.id, {
        name: item.name,
      });
      return json({ data: itemResource(item, db, superAdmin) });
    }

    if (method === "PUT" && id !== null) {
      if (!isAdminPlus(user)) return forbidden();
      const item = db.items.find((i) => i.id === id);
      if (!item) return notFound("Item not found");
      const result = updateItem(db, item, body, superAdmin);
      if (result instanceof Response) return result;
      return json({ data: itemResource(item, db, superAdmin) });
    }

    if (method === "DELETE" && id !== null) {
      if (!superAdmin) return forbidden();
      const item = db.items.find((i) => i.id === id);
      if (!item) return notFound("Item not found");
      db.items.splice(db.items.indexOf(item), 1);
      db.branchStocks = db.branchStocks.filter((s) => s.item_id !== id);
      db.movements = db.movements.filter((m) => m.item_id !== id);
      db.batches = db.batches.filter((b) => b.item_id !== id);
      db.recipes.forEach((recipe) => {
        recipe.items = recipe.items.filter((ri) => ri.item_id !== id);
      });
      pushActivityLog(db, user.id, "item_deleted", "App\\Models\\Item", item.id, {
        name: item.name,
      });
      return json({ message: "Item deleted" });
    }
    return notFound();
  }

  /* -------------------------------------------------------- /suppliers */

  if (head === "suppliers") {
    if (method === "GET" && path.length === 1) {
      const rows = [...db.suppliers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(supplierResource);
      return json(paginate(rows, pageParam(params)));
    }
    if (method === "GET" && id !== null) {
      const supplier = db.suppliers.find((s) => s.id === id);
      if (!supplier) return notFound("Supplier not found");
      return json({ data: supplierResource(supplier) });
    }
    if (method === "POST") {
      if (!isAdminPlus(user)) return forbidden();
      const name = asString(body.name);
      if (!name) return unprocessable("name", "The name field is required.");
      const now = new Date().toISOString();
      const supplier = {
        id: newId(db.suppliers),
        name,
        contact_person: asString(body.contact_person),
        phone: asString(body.phone),
        email: asString(body.email),
        address: asString(body.address),
        lead_time_days: asNumber(body.lead_time_days) ?? 0,
        created_at: now,
        updated_at: now,
      };
      db.suppliers.push(supplier);
      pushActivityLog(db, user.id, "supplier_created", "App\\Models\\Supplier", supplier.id, {
        name: supplier.name,
      });
      return json({ data: supplierResource(supplier) }, 201);
    }
    if (method === "PUT" && id !== null) {
      if (!isAdminPlus(user)) return forbidden();
      const supplier = db.suppliers.find((s) => s.id === id);
      if (!supplier) return notFound("Supplier not found");
      const name = asString(body.name);
      if (name) supplier.name = name;
      const contact = asString(body.contact_person);
      if (contact !== null) supplier.contact_person = contact;
      const phone = asString(body.phone);
      if (phone !== null) supplier.phone = phone;
      const email = asString(body.email);
      if (email !== null) supplier.email = email;
      const address = asString(body.address);
      if (address !== null) supplier.address = address;
      const lead = asNumber(body.lead_time_days);
      if (lead !== null) supplier.lead_time_days = lead;
      supplier.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "supplier_updated", "App\\Models\\Supplier", supplier.id, {
        name: supplier.name,
      });
      return json({ data: supplierResource(supplier) });
    }
    if (method === "DELETE" && id !== null) {
      if (!superAdmin) return forbidden();
      const supplier = db.suppliers.find((s) => s.id === id);
      if (!supplier) return notFound("Supplier not found");
      if (db.items.some((i) => i.default_supplier_id === id)) {
        return unprocessableMessage(
          "Supplier tidak dapat dihapus karena masih menjadi supplier default item"
        );
      }
      db.suppliers.splice(db.suppliers.indexOf(supplier), 1);
      pushActivityLog(db, user.id, "supplier_deleted", "App\\Models\\Supplier", supplier.id, {
        name: supplier.name,
      });
      return json({ message: "Supplier deleted" });
    }
    return notFound();
  }

  /* ------------------------------------------------------------ /staff */

  if (head === "staff") {
    if (method === "GET" && path.length === 1) {
      const branchId = asNumber(params.get("branch_id"));
      const role = asString(params.get("role"));
      const rows = db.users
        .filter(
          (u) =>
            (u.role === "branch_admin" || u.role === "staff") &&
            (branchId === null || u.branch_id === branchId) &&
            (role === null || u.role === role)
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((u) => userResource(u, db));
      return json(collection(rows));
    }
    if (method === "GET" && id !== null) {
      const staff = db.users.find((u) => u.id === id);
      if (!staff) return notFound("Staff not found");
      return json({ data: userResource(staff, db) });
    }
    if (method === "PUT" && id !== null) {
      if (!superAdmin) return forbidden();
      const staff = db.users.find((u) => u.id === id);
      if (!staff) return notFound("Staff not found");
      const name = asString(body.name);
      if (name) staff.name = name;
      const phone = asString(body.phone);
      if (phone !== null) staff.phone = phone;
      const position = asString(body.position);
      if (position !== null) staff.position = position;
      const hireDate = asString(body.hire_date);
      if (hireDate !== null) staff.hire_date = hireDate;
      const branchId = asNumber(body.branch_id);
      if (branchId !== null) staff.branch_id = branchId;
      staff.updated_at = new Date().toISOString();
      return json({ data: userResource(staff, db) });
    }
    return notFound();
  }

  /* ---------------------------------------------------------- /recipes */

  if (head === "recipes") {
    if (method === "GET" && path.length === 1) {
      const rows = [...db.recipes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((recipe) => recipeResource(recipe, db, superAdmin));
      return json(paginate(rows, pageParam(params)));
    }
    if (method === "GET" && id !== null && !action) {
      const recipe = db.recipes.find((r) => r.id === id);
      if (!recipe) return notFound("Recipe not found");
      return json({ data: recipeResource(recipe, db, superAdmin) });
    }
    if (method === "POST" && id !== null && action === "calculate") {
      const yieldQty = asNumber(params.get("yield")) ?? asNumber(body.yield);
      if (!yieldQty || yieldQty < 1) {
        return unprocessable("yield", "The yield field must be at least 1.");
      }
      const branchId = asNumber(params.get("branch_id")) ?? asNumber(body.branch_id);
      const recipe = db.recipes.find((r) => r.id === id);
      if (!recipe) return notFound("Recipe not found");

      const ingredients = recipe.items.map((ri) => {
        const item = db.items.find((i) => i.id === ri.item_id);
        const qtyNeeded = ri.quantity * yieldQty;
        const stockAvailable =
          branchId !== null
            ? db.branchStocks
                .filter((s) => s.branch_id === branchId && s.item_id === ri.item_id)
                .reduce((sum, s) => sum + s.quantity, 0)
            : db.branchStocks
                .filter((s) => s.item_id === ri.item_id)
                .reduce((sum, s) => sum + s.quantity, 0);
        const sufficient = stockAvailable >= qtyNeeded;
        return {
          item_id: ri.item_id,
          item_name: item?.name ?? "-",
          barcode: item?.barcode ?? null,
          unit: item?.unit ?? "-",
          qty_per_batch: ri.quantity,
          qty_needed: qtyNeeded,
          stock_available: Math.round(stockAvailable * 100) / 100,
          sufficient,
          deficit: sufficient ? 0 : Math.round((qtyNeeded - stockAvailable) * 100) / 100,
          cost_per_unit: item?.cost_price ?? 0,
          subtotal: Math.round(qtyNeeded * (item?.cost_price ?? 0) * 100) / 100,
        };
      });

      const totalCost = ingredients.reduce((sum, i) => sum + i.subtotal, 0);
      const insufficientCount = ingredients.filter((i) => !i.sufficient).length;

      return json({
        recipe: { id: recipe.id, name: recipe.name, description: recipe.description },
        yield: yieldQty,
        branch_id: branchId,
        ingredients,
        total_cost: totalCost,
        cost_per_unit: Math.round((totalCost / yieldQty) * 100) / 100,
        summary: {
          total_ingredients: ingredients.length,
          sufficient: ingredients.length - insufficientCount,
          insufficient: insufficientCount,
          all_sufficient: insufficientCount === 0,
        },
      });
    }
    if (method === "POST" && path.length === 1) {
      if (!isAdminPlus(user)) return forbidden();
      const name = asString(body.name);
      if (!name) return unprocessable("name", "The name field is required.");
      const items = Array.isArray(body.items) ? (body.items as Body[]) : [];
      if (items.length === 0) {
        return unprocessable("items", "The items field is required.");
      }
      const now = new Date().toISOString();
      const recipe = {
        id: newId(db.recipes),
        name,
        description: asString(body.description),
        created_at: now,
        updated_at: now,
        items: [] as MockDb["recipes"][number]["items"],
      };
      db.recipes.push(recipe);
      let recipeItemId = newId(db.recipes.flatMap((r) => r.items));
      items.forEach((entry) => {
        const itemId = asNumber(entry.item_id);
        const quantity = asNumber(entry.quantity);
        if (itemId === null || quantity === null) return;
        recipe.items.push({
          id: recipeItemId++,
          recipe_id: recipe.id,
          item_id: itemId,
          quantity,
        });
      });
      pushActivityLog(db, user.id, "recipe_created", "App\\Models\\Recipe", recipe.id, {
        name: recipe.name,
        items_count: recipe.items.length,
      });
      return json({ data: recipeResource(recipe, db, superAdmin) }, 201);
    }
    if (method === "PUT" && id !== null) {
      if (!isAdminPlus(user)) return forbidden();
      const recipe = db.recipes.find((r) => r.id === id);
      if (!recipe) return notFound("Recipe not found");
      const name = asString(body.name);
      if (name) recipe.name = name;
      if (body.description !== undefined) recipe.description = asString(body.description);
      if (Array.isArray(body.items)) {
        const entries = body.items as Body[];
        const existing = new Map(recipe.items.map((ri) => [ri.id, ri]));
        const next: typeof recipe.items = [];
        let counter = newId(recipe.items);
        entries.forEach((entry) => {
          const entryId = asNumber(entry.id);
          const itemId = asNumber(entry.item_id);
          const quantity = asNumber(entry.quantity);
          if (itemId === null || quantity === null) return;
          const previous = entryId !== null ? existing.get(entryId) : undefined;
          next.push({
            id: previous?.id ?? counter++,
            recipe_id: recipe.id,
            item_id: itemId,
            quantity,
          });
        });
        recipe.items = next;
      }
      recipe.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "recipe_updated", "App\\Models\\Recipe", recipe.id, {
        name: recipe.name,
      });
      return json({ data: recipeResource(recipe, db, superAdmin) });
    }
    if (method === "DELETE" && id !== null) {
      if (!superAdmin) return forbidden();
      const recipe = db.recipes.find((r) => r.id === id);
      if (!recipe) return notFound("Recipe not found");
      db.recipes.splice(db.recipes.indexOf(recipe), 1);
      pushActivityLog(db, user.id, "recipe_deleted", "App\\Models\\Recipe", recipe.id, {
        name: recipe.name,
      });
      return json({ message: "Recipe deleted" });
    }
    return notFound();
  }

  /* ---------------------------------------------------------- /finance */

  if (head === "finance") {
    if (path[1] === "hpp" && path.length === 2 && method === "GET") {
      const rows = [...db.recipes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          items_count: recipe.items.length,
          hpp: recipeHpp(recipe, db),
        }));
      return json({ data: rows });
    }
    if (path[1] === "hpp" && id !== null && method === "GET") {
      const recipe = db.recipes.find((r) => r.id === id);
      if (!recipe) return notFound("Recipe not found");
      const items = recipe.items.map((ri) => {
        const item = db.items.find((i) => i.id === ri.item_id);
        const costPrice = item?.cost_price ?? 0;
        return {
          item_id: ri.item_id,
          item_name: item?.name ?? "-",
          unit: item?.unit ?? "-",
          quantity: ri.quantity,
          cost_price: costPrice,
          subtotal: ri.quantity * costPrice,
        };
      });
      return json({
        data: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          items,
          total_hpp: recipeHpp(recipe, db),
        },
      });
    }
    if (path[1] === "loss-report" && method === "GET") {
      const branchId = asNumber(params.get("branch_id"));
      const startDate = asString(params.get("start_date"));
      const endDate = asString(params.get("end_date"));

      const rows = db.movements.filter((m) => {
        if (m.type !== "out") return false;
        if (!["expired", "damaged"].includes(m.reason ?? "")) return false;
        if (branchId !== null && m.branch_id !== branchId) return false;
        const day = m.created_at.slice(0, 10);
        if (startDate && day < startDate) return false;
        if (endDate && day > endDate) return false;
        return true;
      });

      const groups = new Map<number, MovementRow[]>();
      rows.forEach((m) => {
        const list = groups.get(m.item_id) ?? [];
        list.push(m);
        groups.set(m.item_id, list);
      });

      const data = [...groups.entries()].map(([itemId, list]) => {
        const item = db.items.find((i) => i.id === itemId);
        const costPrice = item?.cost_price ?? 0;
        const totalQuantity = list.reduce((sum, m) => sum + m.quantity, 0);
        return {
          item_id: itemId,
          item_name: item?.name ?? "-",
          unit: item?.unit ?? "-",
          cost_price: costPrice,
          total_quantity: totalQuantity,
          total_loss: totalQuantity * costPrice,
          movements_count: list.length,
        };
      });

      return json({
        data,
        grand_total: data.reduce((sum, row) => sum + row.total_loss, 0),
      });
    }
    return notFound();
  }

  /* -------------------------------------------------- /purchase-orders */

  if (head === "purchase-orders") {
    if (method === "GET" && path[1] === "suggestions") {
      const branchId =
        superAdmin && params.get("branch_id")
          ? Number(params.get("branch_id"))
          : user.branch_id;
      const rows =
        branchId === null ? [] : db.branchStocks.filter((s) => s.branch_id === branchId);
      const suggestions = rows
        .filter((stock) => {
          const item = db.items.find((i) => i.id === stock.item_id);
          if (!item) return false;
          return stock.quantity <= item.threshold;
        })
        .map((stock) => {
          const item = db.items.find((i) => i.id === stock.item_id)!;
          return {
            item_id: stock.item_id,
            item_name: item.name,
            unit: item.unit,
            current_quantity: stock.quantity,
            threshold: item.threshold,
            suggested_quantity: Math.max(0, item.threshold * 2 - stock.quantity),
          };
        });
      return json({ data: suggestions });
    }

    if (method === "GET" && path.length === 1) {
      const status = asString(params.get("status"));
      const branchId = asNumber(params.get("branch_id"));
      const rows = db.purchaseOrders
        .filter((po) => {
          if (status && po.status !== status) return false;
          if (isBranchAdmin(user) && po.branch_id !== user.branch_id) return false;
          if (branchId !== null && po.branch_id !== branchId) return false;
          return true;
        })
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((po) => purchaseOrderResource(po, db, superAdmin));
      return json(paginate(rows, pageParam(params)));
    }

    if (method === "GET" && id !== null) {
      const po = db.purchaseOrders.find((p) => p.id === id);
      if (!po) return notFound("Purchase order not found");
      return json({ data: purchaseOrderResource(po, db, superAdmin) });
    }

    if (method === "POST" && path.length === 1) {
      if (!isAdminPlus(user)) return forbidden();
      const supplierId = asNumber(body.supplier_id);
      const branchId = asNumber(body.branch_id);
      if (supplierId === null) return unprocessable("supplier_id", "The supplier id field is required.");
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      const entries = Array.isArray(body.items) ? (body.items as Body[]) : [];
      if (entries.length === 0) return unprocessable("items", "The items field is required.");

      const now = new Date().toISOString();
      const po = {
        id: newId(db.purchaseOrders),
        supplier_id: supplierId,
        branch_id: branchId,
        user_id: user.id,
        status: "draft",
        notes: asString(body.notes),
        created_at: now,
        updated_at: now,
        items: [] as MockDb["purchaseOrders"][number]["items"],
      };
      let poItemId = 1;
      entries.forEach((entry) => {
        const itemId = asNumber(entry.item_id);
        const quantity = asNumber(entry.quantity);
        const unitPrice = asNumber(entry.unit_price);
        if (itemId === null || quantity === null || unitPrice === null) return;
        po.items.push({
          id: poItemId++,
          purchase_order_id: po.id,
          item_id: itemId,
          quantity,
          unit_price: unitPrice,
        });
      });
      po.items.forEach((it, index) => (it.id = newId(db.purchaseOrders.flatMap((p) => p.items)) + index));
      db.purchaseOrders.push(po);

      const total = po.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
      pushActivityLog(db, user.id, "po_created", "App\\Models\\PurchaseOrder", po.id, {
        supplier: db.suppliers.find((s) => s.id === supplierId)?.name ?? "",
        branch: db.branches.find((b) => b.id === branchId)?.name ?? "",
        total,
      });
      return json({ data: purchaseOrderResource(po, db, superAdmin) }, 201);
    }

    if (method === "PUT" && id !== null && action === "status") {
      const po = db.purchaseOrders.find((p) => p.id === id);
      if (!po) return notFound("Purchase order not found");
      if (!superAdmin && !(isBranchAdmin(user) && po.branch_id === user.branch_id)) {
        return forbidden();
      }
      const status = asString(body.status);
      if (!status || !["draft", "sent", "received"].includes(status)) {
        return unprocessable("status", "The selected status is invalid.");
      }
      const oldStatus = po.status;
      po.status = status;
      po.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "po_status_updated", "App\\Models\\PurchaseOrder", po.id, {
        old_status: oldStatus,
        new_status: status,
        supplier: db.suppliers.find((s) => s.id === po.supplier_id)?.name ?? "",
      });
      return json({ data: purchaseOrderResource(po, db, superAdmin) });
    }

    if (method === "DELETE" && id !== null) {
      const po = db.purchaseOrders.find((p) => p.id === id);
      if (!po) return notFound("Purchase order not found");
      const allowed =
        superAdmin || (isBranchAdmin(user) && po.branch_id === user.branch_id && po.status === "draft");
      if (!allowed) return forbidden();
      db.purchaseOrders.splice(db.purchaseOrders.indexOf(po), 1);
      pushActivityLog(db, user.id, "po_deleted", "App\\Models\\PurchaseOrder", po.id, {
        supplier: db.suppliers.find((s) => s.id === po.supplier_id)?.name ?? "",
      });
      return json({ message: "Purchase order deleted" });
    }
    return notFound();
  }

  /* -------------------------------------------------------- /dashboard */

  if (head === "dashboard" && path[1] === "stats" && method === "GET") {
    const scopedStocks = superAdmin
      ? db.branchStocks
      : db.branchStocks.filter((s) => s.branch_id === user.branch_id);

    const statusOf = (stock: (typeof db.branchStocks)[number]) => {
      const item = db.items.find((i) => i.id === stock.item_id);
      return stockStatus(stock.quantity, stock.expiry_date, item?.threshold ?? 0);
    };

    const byCategory = new Map<string, { name: string; count: number; low: number; expired: number; out: number }>();
    scopedStocks.forEach((stock) => {
      const item = db.items.find((i) => i.id === stock.item_id);
      const category = db.categories.find((c) => c.id === item?.category_id);
      const key = category?.name ?? "Lainnya";
      const entry = byCategory.get(key) ?? { name: key, count: 0, low: 0, expired: 0, out: 0 };
      entry.count += 1;
      const status = statusOf(stock);
      if (status === "low_stock") entry.low += 1;
      if (status === "expired") entry.expired += 1;
      if (status === "out_of_stock") entry.out += 1;
      byCategory.set(key, entry);
    });

    const scopedMovements = superAdmin
      ? db.movements
      : db.movements.filter((m) => m.branch_id === user.branch_id);

    const recentMovements = [...scopedMovements]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 7)
      .map((m) => {
        const item = db.items.find((i) => i.id === m.item_id);
        const branch = db.branches.find((b) => b.id === m.branch_id);
        const actor = db.users.find((u) => u.id === m.user_id);
        return {
          id: m.id,
          item: item?.name ?? "—",
          branch: branch?.name ?? "—",
          type: m.type,
          quantity: m.quantity,
          unit: item?.unit ?? "",
          user: actor?.name ?? "—",
          created_at: m.created_at.slice(0, 16).replace("T", " "),
        };
      });

    const windowStart = dateFromNow(-30);
    const inWindow = scopedMovements.filter((m) => m.created_at.slice(0, 10) >= windowStart);
    const inRows = inWindow.filter((m) => m.type === "in");
    const outRows = inWindow.filter((m) => m.type === "out");

    const byDay = new Map<
      string,
      { date: string; in_qty: number; out_qty: number; in_count: number; out_count: number }
    >();
    inWindow.forEach((m) => {
      const day = m.created_at.slice(0, 10);
      const entry = byDay.get(day) ?? { date: day, in_qty: 0, out_qty: 0, in_count: 0, out_count: 0 };
      if (m.type === "in") {
        entry.in_qty += m.quantity;
        entry.in_count += 1;
      } else {
        entry.out_qty += m.quantity;
        entry.out_count += 1;
      }
      byDay.set(day, entry);
    });

    const branchesForStats = superAdmin
      ? db.branches
      : db.branches.filter((b) => b.id === user.branch_id);

    return json({
      total_items: scopedStocks.length,
      low_stock: scopedStocks.filter((s) => statusOf(s) === "low_stock").length,
      expired: scopedStocks.filter((s) => statusOf(s) === "expired").length,
      out_of_stock: scopedStocks.filter((s) => statusOf(s) === "out_of_stock").length,
      good_stock: scopedStocks.filter((s) => statusOf(s) === "good").length,
      by_category: [...byCategory.values()],
      by_branch: branchesForStats.map((branch) => {
        const branchStocks = scopedStocks.filter((s) => s.branch_id === branch.id);
        return {
          name: branch.name,
          // `withCount('stocks')` di backend menghitung baris, bukan qty.
          total: branchStocks.length,
          low: branchStocks.filter((s) => statusOf(s) === "low_stock").length,
          expired: branchStocks.filter((s) => statusOf(s) === "expired").length,
          out: branchStocks.filter((s) => statusOf(s) === "out_of_stock").length,
        };
      }),
      recent_movements: recentMovements,
      movement_summary: {
        in: { total: inRows.length, qty: inRows.reduce((sum, m) => sum + m.quantity, 0) },
        out: { total: outRows.length, qty: outRows.reduce((sum, m) => sum + m.quantity, 0) },
      },
      daily_movements: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    });
  }

  /* ---------------------------------------------------- /stock-batches */

  if (head === "stock-batches") {
    if (method === "GET" && path[1] === "summary") {
      const branchId = asNumber(params.get("branch_id"));
      const groups = new Map<number, { total: number; count: number }>();
      db.batches
        .filter(
          (b) =>
            b.status === "active" &&
            (superAdmin ? branchId === null || b.branch_id === branchId : b.branch_id === user.branch_id)
        )
        .forEach((b) => {
          const entry = groups.get(b.item_id) ?? { total: 0, count: 0 };
          entry.total += b.quantity;
          entry.count += 1;
          groups.set(b.item_id, entry);
        });

      const data = [...groups.entries()].map(([itemId, entry]) => {
        const item = db.items.find((i) => i.id === itemId);
        return {
          item_id: itemId,
          item_name: item?.name ?? "-",
          unit: item?.unit ?? "-",
          total_quantity: Math.round(entry.total * 100) / 100,
          batch_count: entry.count,
        };
      });
      return json({ data });
    }

    if (method === "GET" && path.length === 1) {
      const branchId = asNumber(params.get("branch_id"));
      const itemId = asNumber(params.get("item_id"));
      const status = asString(params.get("status"));
      const expiringSoon = asNumber(params.get("expiring_soon"));

      const rows = db.batches
        .filter((b) => {
          if (!superAdmin && b.branch_id !== user.branch_id) return false;
          if (superAdmin && branchId !== null && b.branch_id !== branchId) return false;
          if (itemId !== null && b.item_id !== itemId) return false;
          if (status && b.status !== status) return false;
          if (expiringSoon !== null) {
            if (!b.expiry_date) return false;
            if (b.expiry_date < dateFromNow(0) || b.expiry_date > dateFromNow(expiringSoon)) return false;
          }
          return true;
        })
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((b) => batchResource(b, db, superAdmin));

      const total = rows.length;
      const lastPage = Math.max(1, Math.ceil(total / 20));
      const current = Math.min(Math.max(1, pageParam(params)), lastPage);
      return json({
        data: rows.slice((current - 1) * 20, current * 20),
        current_page: current,
        last_page: lastPage,
        per_page: 20,
        total,
      });
    }

    if (method === "POST" && path.length === 1) {
      const branchId = asNumber(body.branch_id);
      const itemId = asNumber(body.item_id);
      const quantity = asNumber(body.quantity);
      const productionDate = asString(body.production_date);
      const costPrice = asNumber(body.cost_price);
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      if (itemId === null) return unprocessable("item_id", "The item id field is required.");
      if (quantity === null || quantity <= 0) {
        return unprocessable("quantity", "The quantity must be at least 0.01.");
      }
      if (!productionDate) return unprocessable("production_date", "The production date field is required.");
      if (costPrice === null) return unprocessable("cost_price", "The cost price field is required.");

      const item = db.items.find((i) => i.id === itemId);
      if (!item) return unprocessable("item_id", "The selected item id is invalid.");

      const now = new Date().toISOString();
      const batchCode = `BT-${branchId}${String(newId(db.batches)).padStart(4, "0")}`;
      const batch = {
        id: newId(db.batches),
        branch_id: branchId,
        item_id: itemId,
        batch_code: batchCode,
        quantity,
        production_date: productionDate,
        expiry_date: asString(body.expiry_date),
        storage_location: asString(body.storage_location) ?? "pantry",
        cost_price: costPrice,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      db.batches.push(batch);

      const stock = ensureBranchStock(db, branchId, itemId, batch.storage_location);
      stock.quantity += quantity;
      stock.updated_at = now;
      db.movements.unshift(createMovement(db, branchId, itemId, "in", quantity, `Batch ${batchCode} - Production`, null, user.id));

      return json(batchResource(batch, db, superAdmin), 201);
    }

    if (method === "POST" && path[1] === "consume") {
      const branchId = asNumber(body.branch_id);
      const itemId = asNumber(body.item_id);
      const quantity = asNumber(body.quantity);
      if (branchId === null || itemId === null || quantity === null || quantity <= 0) {
        return unprocessable("quantity", "The quantity must be at least 0.01.");
      }
      const batches = db.batches
        .filter(
          (b) =>
            b.branch_id === branchId && b.item_id === itemId && b.status === "active" && b.quantity > 0
        )
        .sort((a, b) => (a.expiry_date ?? "9999").localeCompare(b.expiry_date ?? "9999"));

      let remaining = quantity;
      const consumed: { batch_code: string; quantity_taken: number }[] = [];
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);
        batch.quantity -= take;
        remaining -= take;
        consumed.push({ batch_code: batch.batch_code, quantity_taken: take });
        if (batch.quantity <= 0) batch.status = "depleted";
      }
      if (remaining > 0) {
        return unprocessable("quantity", `Stok batch tidak mencukupi. Kurang: ${remaining}`);
      }

      const stock = db.branchStocks.find((s) => s.branch_id === branchId && s.item_id === itemId);
      if (stock) stock.quantity = Math.max(0, stock.quantity - quantity);
      db.movements.unshift(
        createMovement(db, branchId, itemId, "out", quantity, "FIFO batch consume", asString(body.reason), user.id)
      );

      return json({ message: `Berhasil mengonsumsi stok dari ${consumed.length} batch`, consumed });
    }

    if (method === "PUT" && id !== null && action === "dispose") {
      const batch = db.batches.find((b) => b.id === id);
      if (!batch) return notFound("Stock batch not found");
      if (batch.status !== "active" || batch.quantity <= 0) {
        return json({ message: "Batch tidak aktif atau sudah habis" }, 400);
      }
      const quantity = batch.quantity;
      batch.quantity = 0;
      batch.status = "disposed";
      batch.updated_at = new Date().toISOString();

      const stock = db.branchStocks.find(
        (s) => s.branch_id === batch.branch_id && s.item_id === batch.item_id
      );
      if (stock) stock.quantity = Math.max(0, stock.quantity - quantity);
      db.movements.unshift(
        createMovement(
          db,
          batch.branch_id,
          batch.item_id,
          "out",
          quantity,
          `Batch ${batch.batch_code} disposed`,
          asString(body.reason) ?? "expired",
          user.id
        )
      );
      return json({ message: "Batch berhasil didisposisi" });
    }
    return notFound();
  }

  /* -------------------------------------------------- /stock-overview */

  if (head === "stock-overview" && method === "GET") {
    const branchId = asNumber(params.get("branch_id"));
    const itemId = asNumber(params.get("item_id"));
    const status = asString(params.get("status"));

    const rows = db.branchStocks
      .filter((stock) => {
        if (branchId !== null && stock.branch_id !== branchId) return false;
        if (itemId !== null && stock.item_id !== itemId) return false;
        if (status) {
          const item = db.items.find((i) => i.id === stock.item_id);
          if (stockStatus(stock.quantity, stock.expiry_date, item?.threshold ?? 0) !== status) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .map((stock) => branchStockResource(stock, db, superAdmin));

    return json(collection(rows));
  }

  /* ------------------------------------------------ /stock-predictions */

  if (head === "stock-predictions") {
    if (method !== "GET") return notFound();
    const branchId = superAdmin
      ? params.get("branch_id")
        ? Number(params.get("branch_id"))
        : null
      : user.branch_id;

    const windowDays = 30;
    const safetyDays = 3;
    const since = dateFromNow(-windowDays);

    const usageMap = new Map<string, number>();
    db.movements
      .filter(
        (m) =>
          m.type === "out" &&
          m.reason === "production" &&
          m.created_at.slice(0, 10) >= since &&
          (branchId === null || m.branch_id === branchId)
      )
      .forEach((m) => {
        const key = `${m.branch_id}:${m.item_id}`;
        usageMap.set(key, (usageMap.get(key) ?? 0) + m.quantity);
      });

    const rows = db.branchStocks
      .filter((stock) => branchId === null || stock.branch_id === branchId)
      .sort((a, b) => a.item_id - b.item_id || a.branch_id - b.branch_id)
      .map((stock) => {
        const item = db.items.find((i) => i.id === stock.item_id);
        const branch = db.branches.find((b) => b.id === stock.branch_id);
        const supplier = db.suppliers.find((s) => s.id === item?.default_supplier_id);
        const totalUsage = usageMap.get(`${stock.branch_id}:${stock.item_id}`);
        const hasUsage = totalUsage !== undefined && totalUsage > 0;
        const avg = hasUsage ? totalUsage / windowDays : 0;
        const leadTime = supplier?.lead_time_days ?? 0;

        const reorderPoint = hasUsage
          ? Math.round(avg * (leadTime + safetyDays) * 100) / 100
          : null;
        const estimatedDaysLeft = hasUsage ? Math.floor(stock.quantity / avg) : null;
        const needsReorder = reorderPoint !== null && stock.quantity <= reorderPoint;

        let suggestedQuantity: number | null = null;
        if (needsReorder && reorderPoint !== null) {
          const target = reorderPoint * 2;
          suggestedQuantity = Math.ceil(
            Math.max(target - stock.quantity, reorderPoint - stock.quantity, 1)
          );
        }

        return {
          item_id: stock.item_id,
          item_name: item?.name ?? "",
          unit: item?.unit ?? "",
          branch_id: stock.branch_id,
          branch_name: branch?.name ?? "",
          quantity: stock.quantity,
          avg_daily_usage: hasUsage ? Math.round(avg * 10000) / 10000 : null,
          estimated_days_left: estimatedDaysLeft,
          lead_time_days: leadTime,
          safety_days: safetyDays,
          reorder_point: reorderPoint,
          needs_reorder: needsReorder,
          suggested_quantity: suggestedQuantity,
          default_supplier_id: item?.default_supplier_id ?? null,
          default_supplier_name: supplier?.name ?? null,
        };
      });

    const data = path[1] === "reorder" ? rows.filter((r) => r.needs_reorder) : rows;
    return json({ window_days: windowDays, safety_days: safetyDays, data });
  }

  /* -------------------------------------------------- /stock-movements */

  if (head === "stock-movements") {
    if (method === "GET" && path.length === 1) {
      const branchId = asNumber(params.get("branch_id"));
      const itemId = asNumber(params.get("item_id"));
      const type = asString(params.get("type"));
      const fromDate = asString(params.get("from_date"));
      const toDate = asString(params.get("to_date"));

      const rows = db.movements
        .filter((m) => {
          if (!superAdmin && m.branch_id !== user.branch_id) return false;
          if (superAdmin && branchId !== null && m.branch_id !== branchId) return false;
          if (itemId !== null && m.item_id !== itemId) return false;
          if (type && m.type !== type) return false;
          const day = m.created_at.slice(0, 10);
          if (fromDate && day < fromDate) return false;
          if (toDate && day > toDate) return false;
          return true;
        })
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((m) => movementResource(m, db, superAdmin));

      return json(paginate(rows, pageParam(params)));
    }

    if (method === "POST" && path.length === 1) {
      const branchId = asNumber(body.branch_id);
      const itemId = asNumber(body.item_id);
      const type = asString(body.type);
      const quantity = asNumber(body.quantity);
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      if (itemId === null) return unprocessable("item_id", "The item id field is required.");
      if (type !== "in" && type !== "out") return unprocessable("type", "The selected type is invalid.");
      if (quantity === null || quantity <= 0) {
        return unprocessable("quantity", "The quantity must be at least 0.01.");
      }

      const stock = ensureBranchStock(
        db,
        branchId,
        itemId,
        asString(body.storage_location) ?? "pantry"
      );

      if (type === "out") {
        if (stock.quantity < quantity) {
          return unprocessable(
            "quantity",
            `Stok tidak mencukupi. Stok tersedia: ${stock.quantity}`
          );
        }
        stock.quantity -= quantity;
      } else {
        stock.quantity += quantity;
        const expiry = asString(body.expiry_date);
        if (expiry) stock.expiry_date = expiry;
        const location = asString(body.storage_location);
        if (location) stock.storage_location = location;
      }
      stock.updated_at = new Date().toISOString();

      const movement = createMovement(
        db,
        branchId,
        itemId,
        type,
        quantity,
        asString(body.note),
        asString(body.reason),
        user.id
      );
      db.movements.unshift(movement);

      if (type === "out") notifyLowStock(db, branchId, itemId);

      return json(
        {
          movement: movementResource(movement, db, superAdmin),
          stock: branchStockResource(stock, db, superAdmin),
        },
        201
      );
    }

    if (method === "POST" && path[1] === "bulk") {
      const branchId = asNumber(body.branch_id);
      const type = asString(body.type);
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      if (type !== "in" && type !== "out") return unprocessable("type", "The selected type is invalid.");
      const entries = Array.isArray(body.items) ? (body.items as Body[]) : [];
      if (entries.length === 0) return unprocessable("items", "The items field is required.");

      // Validasi semua dulu supaya tidak ada perubahan sebagian.
      for (const entry of entries) {
        const itemId = asNumber(entry.item_id);
        const quantity = asNumber(entry.quantity);
        if (itemId === null) {
          return unprocessable("items", "The item id field is required.");
        }
        if (quantity === null || quantity <= 0) {
          return unprocessable(`items.${itemId}.quantity`, "The quantity must be at least 0.01.");
        }
        if (type === "out") {
          const stock = db.branchStocks.find(
            (s) => s.branch_id === branchId && s.item_id === itemId
          );
          const available = stock?.quantity ?? 0;
          if (available < quantity) {
            return unprocessable(
              `items.${itemId}.quantity`,
              `Stok tidak mencukupi untuk item ID ${itemId}. Stok tersedia: ${available}`
            );
          }
        }
      }

      const created = entries.map((entry) => {
        const itemId = asNumber(entry.item_id)!;
        const quantity = asNumber(entry.quantity)!;
        const stock = ensureBranchStock(db, branchId, itemId, "pantry");
        stock.quantity = type === "out" ? Math.max(0, stock.quantity - quantity) : stock.quantity + quantity;
        stock.updated_at = new Date().toISOString();
        const movement = createMovement(db, branchId, itemId, type, quantity, asString(body.note), null, user.id);
        db.movements.unshift(movement);
        if (type === "out") notifyLowStock(db, branchId, itemId);
        return movement;
      });

      return json(
        {
          message: `${created.length} stock movement berhasil dibuat`,
          data: created.map((m) => movementResource(m, db, superAdmin)),
        },
        201
      );
    }
    return notFound();
  }

  /* -------------------------------------------------- /production-logs */

  if (head === "production-logs") {
    if (method === "GET" && path.length === 1) {
      const branchId = asNumber(params.get("branch_id"));
      const recipeId = asNumber(params.get("recipe_id"));
      const fromDate = asString(params.get("from_date"));
      const toDate = asString(params.get("to_date"));

      const rows = db.productionLogs
        .filter((log) => {
          if (!superAdmin && log.branch_id !== user.branch_id) return false;
          if (superAdmin && branchId !== null && log.branch_id !== branchId) return false;
          if (recipeId !== null && log.recipe_id !== recipeId) return false;
          if (fromDate && log.produced_at < fromDate) return false;
          if (toDate && log.produced_at > toDate) return false;
          return true;
        })
        .sort((a, b) =>
          a.produced_at === b.produced_at ? b.id - a.id : a.produced_at < b.produced_at ? 1 : -1
        )
        .map((log) => productionLogResource(log, db, superAdmin));

      return json(paginate(rows, pageParam(params)));
    }

    if (method === "POST" && path.length === 1) {
      const branchId = asNumber(body.branch_id);
      const recipeId = asNumber(body.recipe_id);
      const quantity = asNumber(body.quantity);
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      if (recipeId === null) return unprocessable("recipe_id", "The recipe id field is required.");
      if (quantity === null || quantity < 1) {
        return unprocessable("quantity", "The quantity must be at least 1.");
      }
      if (!superAdmin && branchId !== user.branch_id) {
        return json({ message: "Tidak bisa mencatat produksi untuk cabang lain" }, 403);
      }

      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (!recipe) return unprocessable("recipe_id", "The selected recipe id is invalid.");
      if (recipe.items.length === 0) {
        return unprocessableMessage("Resep tidak memiliki daftar bahan");
      }

      const needs = recipe.items.map((ri) => {
        const item = db.items.find((i) => i.id === ri.item_id);
        return {
          item_id: ri.item_id,
          item_name: item?.name ?? "-",
          unit: item?.unit ?? "-",
          qty_needed: Math.round(ri.quantity * quantity * 100) / 100,
        };
      });

      const missing = needs
        .map((need) => {
          const stock = db.branchStocks.find(
            (s) => s.branch_id === branchId && s.item_id === need.item_id
          );
          const available = stock?.quantity ?? 0;
          return {
            ...need,
            available,
            deficit: Math.round((need.qty_needed - available) * 100) / 100,
          };
        })
        .filter((entry) => entry.available < entry.qty_needed);

      if (missing.length > 0) {
        return json(
          {
            message: `Stok bahan tidak mencukupi: ${missing
              .map((m) => `${m.item_name} kurang ${m.deficit} ${m.unit}`)
              .join(", ")}`,
            missing,
          },
          422
        );
      }

      const now = new Date().toISOString();
      const log = {
        id: newId(db.productionLogs),
        branch_id: branchId,
        recipe_id: recipeId,
        user_id: user.id,
        quantity,
        produced_at: asString(body.produced_at) ?? dateFromNow(0),
        notes: asString(body.notes),
        created_at: now,
        updated_at: now,
        items: [] as MockDb["productionLogs"][number]["items"],
      };
      db.productionLogs.push(log);

      let logItemId = newId(db.productionLogs.flatMap((l) => l.items));
      needs.forEach((need) => {
        const stock = db.branchStocks.find(
          (s) => s.branch_id === branchId && s.item_id === need.item_id
        );
        if (stock) {
          stock.quantity = Math.max(0, stock.quantity - need.qty_needed);
          stock.updated_at = now;
        }
        db.movements.unshift(
          createMovement(
            db,
            branchId,
            need.item_id,
            "out",
            need.qty_needed,
            `Produksi ${recipe.name} — ${quantity} batch (Log #${log.id})`,
            "production",
            user.id
          )
        );
        log.items.push({
          id: logItemId++,
          production_log_id: log.id,
          item_id: need.item_id,
          quantity_used: need.qty_needed,
        });
      });

      pushActivityLog(db, user.id, "production_recorded", "App\\Models\\ProductionLog", log.id, {
        branch_id: branchId,
        recipe_id: recipeId,
        recipe_name: recipe.name,
        quantity,
        items_count: needs.length,
      });

      return json({ data: productionLogResource(log, db, superAdmin) }, 201);
    }
    return notFound();
  }

  /* --------------------------------------------------- /stock-opnames */

  if (head === "stock-opnames") {
    if (method === "GET" && path.length === 1) {
      const status = asString(params.get("status"));
      const branchId = asNumber(params.get("branch_id"));
      const rows = db.opnames
        .filter((opname) => {
          if (status && opname.status !== status) return false;
          if (isBranchAdmin(user) && opname.branch_id !== user.branch_id) return false;
          if (branchId !== null && opname.branch_id !== branchId) return false;
          return true;
        })
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((opname) => opnameResource(opname, db, superAdmin));
      return json(paginate(rows, pageParam(params)));
    }

    if (method === "GET" && id !== null) {
      const opname = db.opnames.find((o) => o.id === id);
      if (!opname) return notFound("Stock opname not found");
      return json({ data: opnameResource(opname, db, superAdmin) });
    }

    if (method === "POST" && path.length === 1) {
      const branchId = asNumber(body.branch_id);
      if (branchId === null) return unprocessable("branch_id", "The branch id field is required.");
      const entries = Array.isArray(body.items) ? (body.items as Body[]) : [];
      if (entries.length === 0) return unprocessable("items", "The items field is required.");

      const now = new Date().toISOString();
      const opname = {
        id: newId(db.opnames),
        branch_id: branchId,
        user_id: user.id,
        status: "draft",
        approved_by: null,
        notes: asString(body.notes),
        created_at: now,
        updated_at: now,
        items: [] as MockDb["opnames"][number]["items"],
      };
      let opnameItemId = newId(db.opnames.flatMap((o) => o.items));
      entries.forEach((entry) => {
        const itemId = asNumber(entry.item_id);
        const qtyFisik = asNumber(entry.qty_fisik);
        if (itemId === null || qtyFisik === null) return;
        const stock = db.branchStocks.find(
          (s) => s.branch_id === branchId && s.item_id === itemId
        );
        const qtySystem = stock?.quantity ?? 0;
        opname.items.push({
          id: opnameItemId++,
          stock_opname_id: opname.id,
          item_id: itemId,
          qty_system: qtySystem,
          qty_fisik: qtyFisik,
          selisih: qtyFisik - qtySystem,
        });
      });
      db.opnames.push(opname);

      pushActivityLog(db, user.id, "stock_opname_created", "App\\Models\\StockOpname", opname.id, {
        branch_id: branchId,
        items_count: opname.items.length,
      });
      return json({ data: opnameResource(opname, db, superAdmin) }, 201);
    }

    if (method === "PUT" && id !== null && action === "submit") {
      const opname = db.opnames.find((o) => o.id === id);
      if (!opname) return notFound("Stock opname not found");
      if (!superAdmin && !(isBranchAdmin(user) && opname.branch_id === user.branch_id)) {
        return forbidden();
      }
      if (opname.status !== "draft") {
        return unprocessableMessage("Hanya opname draft yang bisa disubmit");
      }
      const entries = Array.isArray(body.items) ? (body.items as Body[]) : [];
      entries.forEach((entry) => {
        const entryId = asNumber(entry.id);
        const qtyFisik = asNumber(entry.qty_fisik);
        if (entryId === null || qtyFisik === null) return;
        const opnameItem = opname.items.find((i) => i.id === entryId);
        if (!opnameItem) return;
        opnameItem.qty_fisik = qtyFisik;
        opnameItem.selisih = qtyFisik - opnameItem.qty_system;
      });
      opname.status = "pending_approval";
      opname.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "stock_opname_submitted", "App\\Models\\StockOpname", opname.id, {
        branch_id: opname.branch_id,
      });
      return json({ data: opnameResource(opname, db, superAdmin) });
    }

    if (method === "PUT" && id !== null && action === "approve") {
      const opname = db.opnames.find((o) => o.id === id);
      if (!opname) return notFound("Stock opname not found");
      const allowed =
        superAdmin || (isBranchAdmin(user) && opname.branch_id === user.branch_id);
      if (!allowed) return forbidden();
      if (opname.status !== "pending_approval") {
        return unprocessableMessage("Hanya opname pending approval yang bisa di-approve");
      }
      if (opname.user_id === user.id) {
        return unprocessableMessage("Tidak bisa approve opname yang dibuat sendiri");
      }

      const now = new Date().toISOString();
      opname.items.forEach((opnameItem) => {
        if ((opnameItem.selisih ?? 0) === 0) return;
        const stock = db.branchStocks.find(
          (s) => s.branch_id === opname.branch_id && s.item_id === opnameItem.item_id
        );
        if (!stock) return;
        const selisih = opnameItem.selisih ?? 0;
        if (selisih > 0) stock.quantity += selisih;
        else stock.quantity = Math.max(0, stock.quantity - Math.abs(selisih));
        stock.updated_at = now;
        db.movements.unshift(
          createMovement(
            db,
            opname.branch_id,
            opnameItem.item_id,
            selisih > 0 ? "in" : "out",
            Math.abs(selisih),
            `Stock opname #${opname.id} — selisih ${selisih}`,
            "opname",
            user.id
          )
        );
      });

      opname.status = "approved";
      opname.approved_by = user.id;
      opname.updated_at = now;
      pushActivityLog(db, user.id, "stock_opname_approved", "App\\Models\\StockOpname", opname.id, {
        branch_id: opname.branch_id,
      });
      return json({ data: opnameResource(opname, db, superAdmin) });
    }

    if (method === "DELETE" && id !== null) {
      const opname = db.opnames.find((o) => o.id === id);
      if (!opname) return notFound("Stock opname not found");
      const allowed =
        superAdmin ||
        (isBranchAdmin(user) &&
          opname.branch_id === user.branch_id &&
          opname.status === "draft");
      if (!allowed) return forbidden();
      if (opname.status === "approved") {
        return unprocessableMessage("Opname yang sudah di-approve tidak bisa dihapus");
      }
      db.opnames.splice(db.opnames.indexOf(opname), 1);
      return json({ message: "Stock opname deleted" });
    }
    return notFound();
  }

  /* ------------------------------------------------- /stock-transfers */

  if (head === "stock-transfers") {
    if (method === "GET" && path.length === 1) {
      const status = asString(params.get("status"));
      const rows = db.transfers
        .filter((transfer) => {
          if (!superAdmin && transfer.from_branch_id !== user.branch_id && transfer.to_branch_id !== user.branch_id) {
            return false;
          }
          if (status && transfer.status !== status) return false;
          return true;
        })
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .map((transfer) => transferResource(transfer, db, superAdmin));
      return json(paginate(rows, pageParam(params)));
    }

    if (method === "GET" && id !== null) {
      const transfer = db.transfers.find((t) => t.id === id);
      if (!transfer) return notFound("Stock transfer not found");
      return json({ data: transferResource(transfer, db, superAdmin) });
    }

    if (method === "POST" && path.length === 1) {
      if (!isAdminPlus(user)) return forbidden();
      const fromBranchId = asNumber(body.from_branch_id);
      const toBranchId = asNumber(body.to_branch_id);
      if (fromBranchId === null) {
        return unprocessable("from_branch_id", "The from branch id field is required.");
      }
      if (toBranchId === null) {
        return unprocessable("to_branch_id", "The to branch id field is required.");
      }
      if (fromBranchId === toBranchId) {
        return unprocessable("to_branch_id", "Cabang asal dan tujuan tidak boleh sama.");
      }
      const entries = Array.isArray(body.items) ? (body.items as Body[]) : [];
      if (entries.length === 0) return unprocessable("items", "The items field is required.");

      const now = new Date().toISOString();
      const transfer = {
        id: newId(db.transfers),
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        user_id: user.id,
        approved_by: null,
        status: "pending",
        notes: asString(body.notes),
        created_at: now,
        updated_at: now,
        items: [] as MockDb["transfers"][number]["items"],
      };
      let transferItemId = newId(db.transfers.flatMap((t) => t.items));
      entries.forEach((entry) => {
        const itemId = asNumber(entry.item_id);
        const quantity = asNumber(entry.quantity);
        if (itemId === null || quantity === null) return;
        transfer.items.push({
          id: transferItemId++,
          stock_transfer_id: transfer.id,
          item_id: itemId,
          quantity,
        });
      });
      db.transfers.push(transfer);

      pushActivityLog(db, user.id, "transfer_created", "App\\Models\\StockTransfer", transfer.id, {
        from: db.branches.find((b) => b.id === fromBranchId)?.name ?? "",
        to: db.branches.find((b) => b.id === toBranchId)?.name ?? "",
        items_count: transfer.items.length,
      });
      return json(
        { message: "Transfer stok berhasil dibuat", data: transferResource(transfer, db, superAdmin) },
        201
      );
    }

    if (method === "PUT" && id !== null && action && ["approve", "received", "reject"].includes(action)) {
      const transfer = db.transfers.find((t) => t.id === id);
      if (!transfer) return notFound("Stock transfer not found");

      const isTargetAdmin = isBranchAdmin(user) && transfer.to_branch_id === user.branch_id;
      const isSourceAdmin = isBranchAdmin(user) && transfer.from_branch_id === user.branch_id;

      if (action === "approve") {
        if (!superAdmin && !isTargetAdmin) return forbidden();
        if (transfer.status !== "pending") {
          return unprocessableMessage("Transfer sudah diproses sebelumnya");
        }
        transfer.status = "approved";
        transfer.approved_by = user.id;
        transfer.updated_at = new Date().toISOString();
        pushActivityLog(db, user.id, "transfer_approved", "App\\Models\\StockTransfer", transfer.id, {
          from: db.branches.find((b) => b.id === transfer.from_branch_id)?.name ?? "",
          to: db.branches.find((b) => b.id === transfer.to_branch_id)?.name ?? "",
        });
        return json({
          message: "Transfer stok disetujui",
          data: transferResource(transfer, db, superAdmin),
        });
      }

      if (action === "received") {
        if (!superAdmin && !isTargetAdmin) return forbidden();
        if (transfer.status !== "approved") {
          return unprocessableMessage("Transfer belum disetujui");
        }
        const now = new Date().toISOString();
        for (const entry of transfer.items) {
          const fromStock = db.branchStocks.find(
            (s) => s.branch_id === transfer.from_branch_id && s.item_id === entry.item_id
          );
          const available = fromStock?.quantity ?? 0;
          if (available < entry.quantity) {
            const itemName =
              db.items.find((i) => i.id === entry.item_id)?.name ?? `ID ${entry.item_id}`;
            return unprocessableMessage(
              `Stok '${itemName}' di cabang asal tidak mencukupi (tersedia: ${available}, dibutuhkan: ${entry.quantity})`
            );
          }
          if (fromStock) {
            fromStock.quantity -= entry.quantity;
            fromStock.updated_at = now;
          }
          db.movements.unshift(
            createMovement(
              db,
              transfer.from_branch_id,
              entry.item_id,
              "out",
              entry.quantity,
              `Transfer ke cabang ${db.branches.find((b) => b.id === transfer.to_branch_id)?.name ?? ""}`,
              "transfer",
              user.id
            )
          );

          const toStock = ensureBranchStock(db, transfer.to_branch_id, entry.item_id, "pantry");
          toStock.quantity += entry.quantity;
          toStock.updated_at = now;
          db.movements.unshift(
            createMovement(
              db,
              transfer.to_branch_id,
              entry.item_id,
              "in",
              entry.quantity,
              `Transfer dari cabang ${db.branches.find((b) => b.id === transfer.from_branch_id)?.name ?? ""}`,
              "transfer",
              user.id
            )
          );
        }
        transfer.status = "received";
        transfer.updated_at = now;
        pushActivityLog(db, user.id, "transfer_received", "App\\Models\\StockTransfer", transfer.id, {
          from: db.branches.find((b) => b.id === transfer.from_branch_id)?.name ?? "",
          to: db.branches.find((b) => b.id === transfer.to_branch_id)?.name ?? "",
        });
        return json({
          message: "Transfer stok diterima, stok telah diperbarui",
          data: transferResource(transfer, db, superAdmin),
        });
      }

      // reject — hanya admin cabang tujuan atau super_admin
      if (!superAdmin && !isTargetAdmin) return forbidden();
      if (transfer.status !== "pending") {
        return unprocessableMessage("Hanya transfer pending yang bisa ditolak");
      }
      transfer.status = "rejected";
      transfer.updated_at = new Date().toISOString();
      pushActivityLog(db, user.id, "transfer_rejected", "App\\Models\\StockTransfer", transfer.id, {
        from: db.branches.find((b) => b.id === transfer.from_branch_id)?.name ?? "",
        to: db.branches.find((b) => b.id === transfer.to_branch_id)?.name ?? "",
      });
      return json({
        message: "Transfer stok ditolak",
        data: transferResource(transfer, db, superAdmin),
      });
    }

    if (method === "DELETE" && id !== null) {
      const transfer = db.transfers.find((t) => t.id === id);
      if (!transfer) return notFound("Stock transfer not found");
      const allowed =
        superAdmin ||
        (isBranchAdmin(user) && transfer.from_branch_id === user.branch_id && transfer.status === "pending");
      if (!allowed) return forbidden();
      if (transfer.status !== "pending") {
        return unprocessableMessage("Hanya transfer pending yang bisa dibatalkan");
      }
      db.transfers.splice(db.transfers.indexOf(transfer), 1);
      pushActivityLog(db, user.id, "transfer_deleted", "App\\Models\\StockTransfer", transfer.id, {
        from: db.branches.find((b) => b.id === transfer.from_branch_id)?.name ?? "",
        to: db.branches.find((b) => b.id === transfer.to_branch_id)?.name ?? "",
      });
      return json({ message: "Transfer stok dibatalkan" });
    }
    return notFound();
  }

  /* --------------------------------------------------- /activity-logs */

  if (head === "activity-logs" && method === "GET" && path.length === 1) {
    const actionFilter = asString(params.get("action"));
    const userIdFilter = asNumber(params.get("user_id"));
    const fromDate = asString(params.get("from_date"));
    const toDate = asString(params.get("to_date"));

    const rows = db.activityLogs
      .filter((log) => {
        if (actionFilter && log.action !== actionFilter) return false;
        if (userIdFilter !== null && log.user_id !== userIdFilter) return false;
        const day = log.created_at.slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((log) => activityLogResource(log, db, superAdmin));

    return json(paginate(rows, pageParam(params)));
  }

  /* -------------------------------------------------------- /export */

  if (head === "export" && method === "GET") {
    const branchId = asNumber(params.get("branch_id"));
    const scopedMovements = db.movements
      .filter((m) => {
        if (!superAdmin && m.branch_id !== user.branch_id) return false;
        if (superAdmin && branchId !== null && m.branch_id !== branchId) return false;
        return true;
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const movementRows = (rows: MovementRow[]) =>
      rows.map((m) => {
        const item = db.items.find((i) => i.id === m.item_id);
        const branch = db.branches.find((b) => b.id === m.branch_id);
        const actor = db.users.find((u) => u.id === m.user_id);
        return [
          m.created_at.slice(0, 16).replace("T", " "),
          branch?.name ?? "",
          item?.name ?? "",
          m.type === "in" ? "Masuk" : "Keluar",
          m.quantity,
          item?.unit ?? "",
          m.note ?? "",
          actor?.name ?? "",
        ] as (string | number)[];
      });

    const header = ["Tanggal", "Cabang", "Item", "Tipe", "Jumlah", "Satuan", "Catatan", "User"];

    if (path[1] === "dashboard") {
      const fromDate = asString(params.get("start_date"));
      const toDate = asString(params.get("end_date"));
      const rows = scopedMovements.filter((m) => {
        const day = m.created_at.slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
        return true;
      });
      return csvResponse([header, ...movementRows(rows)], "dashboard-export.csv");
    }

    if (path[1] === "stock-movements") {
      const type = asString(params.get("type"));
      const fromDate = asString(params.get("from_date"));
      const toDate = asString(params.get("to_date"));
      const rows = scopedMovements.filter((m) => {
        if (type && m.type !== type) return false;
        const day = m.created_at.slice(0, 10);
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
        return true;
      });
      return csvResponse([header, ...movementRows(rows)], "stock-movements-export.csv");
    }

    if (path[1] === "loss-report") {
      const startDate = asString(params.get("start_date"));
      const endDate = asString(params.get("end_date"));
      const rows = db.movements.filter((m) => {
        if (m.type !== "out") return false;
        if (!["expired", "damaged"].includes(m.reason ?? "")) return false;
        if (!superAdmin && m.branch_id !== user.branch_id) return false;
        if (superAdmin && branchId !== null && m.branch_id !== branchId) return false;
        const day = m.created_at.slice(0, 10);
        if (startDate && day < startDate) return false;
        if (endDate && day > endDate) return false;
        return true;
      });

      const groups = new Map<number, number>();
      rows.forEach((m) => groups.set(m.item_id, (groups.get(m.item_id) ?? 0) + m.quantity));

      const out: (string | number)[][] = [
        ["Item", "Satuan", "Harga Satuan", "Total Qty", "Total Kerugian", "Jumlah Transaksi"],
      ];
      let grandTotal = 0;
      groups.forEach((totalQuantity, itemId) => {
        const item = db.items.find((i) => i.id === itemId);
        const costPrice = item?.cost_price ?? 0;
        const totalLoss = totalQuantity * costPrice;
        const count = rows.filter((m) => m.item_id === itemId).length;
        grandTotal += totalLoss;
        out.push([item?.name ?? "-", item?.unit ?? "-", costPrice, totalQuantity, totalLoss, count]);
      });
      out.push(["", "", "", "", "TOTAL", grandTotal]);
      return csvResponse(out, "loss-report-export.csv");
    }

    if (path[1] === "hpp") {
      const out: (string | number)[][] = [["Resep", "Deskripsi", "Jumlah Bahan", "Total HPP"]];
      [...db.recipes]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((recipe) => {
          out.push([recipe.name, recipe.description ?? "", recipe.items.length, recipeHpp(recipe, db)]);
        });
      return csvResponse(out, "hpp-export.csv");
    }
    return notFound();
  }

  /* --------------------------------------------------- /notifications */

  if (head === "notifications") {
    const mine = db.notifications
      .filter((n) => n.user_id === user.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    if (method === "GET" && path[1] === "unread-count") {
      return json({ count: mine.filter((n) => n.read_at === null).length });
    }

    if (method === "GET" && path.length === 1) {
      const rows = mine.map(notificationResource);
      return json(paginate(rows, pageParam(params)));
    }

    if (method === "PUT" && path[1] === "read-all") {
      const now = new Date().toISOString();
      mine.forEach((n) => {
        if (n.read_at === null) n.read_at = now;
      });
      return json({ message: "Semua notifikasi ditandai sudah dibaca" });
    }

    if (method === "PUT" && id !== null && action === "read") {
      const notification = db.notifications.find((n) => n.id === id);
      if (!notification) return notFound("Notification not found");
      if (notification.user_id !== user.id) return forbidden("Unauthorized");
      notification.read_at = new Date().toISOString();
      return json({ message: "Notifikasi ditandai sudah dibaca" });
    }
    return notFound();
  }

  void request;
  return notFound();
}

/* ------------------------------------------------------------- helpers */

function ensureBranchStock(db: MockDb, branchId: number, itemId: number, location: string) {
  const existing = db.branchStocks.find(
    (s) => s.branch_id === branchId && s.item_id === itemId
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const created = {
    id: newId(db.branchStocks),
    branch_id: branchId,
    item_id: itemId,
    quantity: 0,
    storage_location: location,
    expiry_date: null,
    created_at: now,
    updated_at: now,
  };
  db.branchStocks.push(created);
  return created;
}

function createMovement(
  db: MockDb,
  branchId: number,
  itemId: number,
  type: "in" | "out",
  quantity: number,
  note: string | null,
  reason: string | null,
  userId: number
): MovementRow {
  const now = new Date().toISOString();
  return {
    id: newId(db.movements),
    branch_id: branchId,
    item_id: itemId,
    type,
    quantity,
    note,
    reason,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };
}

function createItem(db: MockDb, body: Body, superAdmin: boolean): ItemRowLike | Response {
  const name = asString(body.name);
  const unit = asString(body.unit);
  const categoryId = asNumber(body.category_id);
  const threshold = asNumber(body.threshold);

  if (!name) return unprocessable("name", "The name field is required.");
  if (categoryId === null || !db.categories.some((c) => c.id === categoryId)) {
    return unprocessable("category_id", "The selected category id is invalid.");
  }
  if (!unit) return unprocessable("unit", "The unit field is required.");
  if (threshold === null) return unprocessable("threshold", "The threshold field is required.");

  const now = new Date().toISOString();
  const id = newId(db.items);
  const item = {
    id,
    name,
    barcode: asString(body.barcode) ?? `MYB-${String(id).padStart(5, "0")}`,
    default_supplier_id: asNumber(body.default_supplier_id),
    category_id: categoryId,
    unit,
    threshold,
    is_perishable: body.is_perishable === "1" || body.is_perishable === 1 || body.is_perishable === true,
    cost_price: asNumber(body.cost_price) ?? 0,
    image: null,
    created_at: now,
    updated_at: now,
  };
  db.items.push(item);
  void superAdmin;
  return item;
}

function updateItem(
  db: MockDb,
  item: ItemRowLike,
  body: Body,
  _superAdmin: boolean
): ItemRowLike | Response {
  const name = asString(body.name);
  if (name) item.name = name;
  const unit = asString(body.unit);
  if (unit) item.unit = unit;
  const categoryId = asNumber(body.category_id);
  if (categoryId !== null) item.category_id = categoryId;
  const threshold = asNumber(body.threshold);
  if (threshold !== null) item.threshold = threshold;
  if (body.is_perishable !== undefined) {
    item.is_perishable =
      body.is_perishable === "1" || body.is_perishable === 1 || body.is_perishable === true;
  }
  const supplierId = body.default_supplier_id;
  if (supplierId !== undefined) {
    const parsed = asString(supplierId);
    item.default_supplier_id = parsed === null ? null : Number(parsed);
  }
  const costPrice = asNumber(body.cost_price);
  if (costPrice !== null) item.cost_price = costPrice;
  const barcode = asString(body.barcode);
  if (barcode) item.barcode = barcode;
  item.updated_at = new Date().toISOString();
  return item;
}

type ItemRowLike = MockDb["items"][number];

export { csrfCookie, timestampDaysAgo, makeRng };

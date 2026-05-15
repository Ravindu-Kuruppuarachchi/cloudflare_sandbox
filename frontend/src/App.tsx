import { useState, useEffect, useCallback } from "react";
import ItemModal from "./ItemModal";

export interface Category {
  id: number;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  low_stock_threshold: number;
  created_at: number;
  updated_at: number;
}

export type ItemDraft = Omit<Item, "id" | "category_name" | "created_at" | "updated_at">;

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (categoryId) p.set("category_id", categoryId);
    if (showLowStock) p.set("low_stock", "true");
    const res = await fetch(`/api/items?${p}`);
    setItems((await res.json()) as Item[]);
  }, [search, categoryId, showLowStock]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d as Category[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchItems().finally(() => setLoading(false));
  }, [fetchItems]);

  async function saveItem(draft: ItemDraft, id?: string) {
    const method = id ? "PUT" : "POST";
    const url = id ? `/api/items/${id}` : "/api/items";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setEditingItem(null);
    setIsAdding(false);
    await fetchItems();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/items/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    await fetchItems();
  }

  const lowStockCount = items.filter((i) => i.quantity <= i.low_stock_threshold).length;
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="app">
      <header className="header">
        <h1>ISA Inventory</h1>
        <div className="header-right">
          <input
            className="search"
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            className={`btn-ghost${showLowStock ? " active" : ""}`}
            onClick={() => setShowLowStock((v) => !v)}
          >
            ⚠ Low Stock
          </button>
          <button className="btn-primary" onClick={() => setIsAdding(true)}>
            + Add Item
          </button>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-val">{items.length}</span> items
        </div>
        <div className="stat">
          <span className="stat-val">{totalUnits.toLocaleString()}</span> total units
        </div>
        <div className={`stat${lowStockCount > 0 ? " stat-warn" : ""}`}>
          <span className="stat-val">{lowStockCount}</span> low stock
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            {search || categoryId || showLowStock
              ? "No items match your filters."
              : "No items yet — add your first item above."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.quantity <= item.low_stock_threshold;
                return (
                  <tr key={item.id}>
                    <td className="td-name">
                      <span className="item-name">{item.name}</span>
                      {item.description && (
                        <span className="item-desc">{item.description}</span>
                      )}
                    </td>
                    <td>{item.category_name ?? <span className="muted">—</span>}</td>
                    <td className={isLow ? "qty-low" : ""}>{item.quantity}</td>
                    <td className="muted">{item.unit}</td>
                    <td>
                      {item.price != null
                        ? `$${item.price.toFixed(2)}`
                        : <span className="muted">—</span>}
                    </td>
                    <td>
                      {isLow
                        ? <span className="badge-low">Low</span>
                        : <span className="badge-ok">OK</span>}
                    </td>
                    <td className="td-actions">
                      <button
                        className="btn-icon"
                        title="Edit"
                        onClick={() => setEditingItem(item)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-del"
                        title="Delete"
                        onClick={() => setDeleteTarget(item)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {(isAdding || editingItem) && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onSave={saveItem}
          onClose={() => { setIsAdding(false); setEditingItem(null); }}
        />
      )}

      {deleteTarget && (
        <div className="overlay" onClick={() => setDeleteTarget(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete "{deleteTarget.name}"?</h3>
            <p>This cannot be undone.</p>
            <div className="dialog-actions">
              <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

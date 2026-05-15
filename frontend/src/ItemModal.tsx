import { useState } from "react";
import type { Item, Category, ItemDraft } from "./App";

interface Props {
  item: Item | null;
  categories: Category[];
  onSave: (draft: ItemDraft, id?: string) => Promise<void>;
  onClose: () => void;
}

export default function ItemModal({ item, categories, onSave, onClose }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id?.toString() ?? "");
  const [quantity, setQuantity] = useState(item?.quantity?.toString() ?? "0");
  const [unit, setUnit] = useState(item?.unit ?? "unit");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [threshold, setThreshold] = useState(item?.low_stock_threshold?.toString() ?? "10");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          description: description.trim(),
          category_id: categoryId ? Number(categoryId) : null,
          quantity: Math.max(0, Math.floor(Number(quantity) || 0)),
          unit: unit.trim() || "unit",
          price: price !== "" ? Number(price) : null,
          low_stock_threshold: Math.max(0, Math.floor(Number(threshold) || 0)),
        },
        item?.id
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{item ? "Edit Item" : "Add Item"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name <span className="required">*</span></label>
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wireless Keyboard"
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div className="form-row">
            <div className="field" style={{ margin: 0 }}>
              <label>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Unit</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit, kg, pcs…"
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }} />

          <div className="form-row-3">
            <div className="field" style={{ margin: 0 }}>
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

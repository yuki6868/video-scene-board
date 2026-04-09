import { useEffect, useState } from "react";

export default function AssetEditModal({
  isOpen,
  asset,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (asset) {
      setForm({
        title: asset.title || "",
        asset_type: asset.asset_type || "material",
        status: asset.status || "idea",
        location_type: asset.location_type || "none",
        path_or_url: asset.path_or_url || "",
        memo: asset.memo || "",
      });
    }
  }, [asset]);

  if (!isOpen || !form) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content asset-edit-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>素材編集</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="asset-edit-form" onSubmit={handleSubmit}>
          <div className="asset-edit-grid">
            <div className="form-field">
              <label htmlFor="asset-title">タイトル</label>
              <input
                id="asset-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="タイトル"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="asset-type">種別</label>
              <select
                id="asset-type"
                name="asset_type"
                value={form.asset_type}
                onChange={handleChange}
              >
                <option value="material">素材</option>
                <option value="audio">音声</option>
                <option value="background">背景</option>
                <option value="se">SE</option>
                <option value="bgm">BGM</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="asset-status">状態</label>
              <select
                id="asset-status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="idea">未着手</option>
                <option value="searching">探し中</option>
                <option value="creating">作成中</option>
                <option value="ready">準備済み</option>
                <option value="missing">不足</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="asset-location-type">保存場所</label>
              <select
                id="asset-location-type"
                name="location_type"
                value={form.location_type}
                onChange={handleChange}
              >
                <option value="none">未作成</option>
                <option value="url">URL</option>
              </select>
            </div>

            {form.location_type === "url" && (
              <div className="form-field form-field-full">
                <label htmlFor="asset-path">URL</label>
                <input
                  id="asset-path"
                  name="path_or_url"
                  value={form.path_or_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="form-field form-field-full">
              <label htmlFor="asset-memo">メモ</label>
              <textarea
                id="asset-memo"
                name="memo"
                value={form.memo}
                onChange={handleChange}
                placeholder="補足メモ"
                rows={5}
              />
            </div>
          </div>

          <div className="asset-edit-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button type="submit" className="submit-button">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
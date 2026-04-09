export default function VideoModal({
  isOpen,
  form,
  editingVideoId,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingVideoId ? "動画編集" : "動画追加"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="scene-form modal-form" onSubmit={onSubmit}>
          <input
            name="title"
            placeholder="動画タイトル"
            value={form.title}
            onChange={onChange}
            required
          />

          <textarea
            name="description"
            placeholder="動画の説明"
            value={form.description}
            onChange={onChange}
            rows={5}
          />

          <input
            name="concept"
            placeholder="コンセプト"
            value={form.concept || ""}
            onChange={onChange}
          />

          <input
            name="target"
            placeholder="ターゲット"
            value={form.target || ""}
            onChange={onChange}
          />

          <input
            name="goal"
            placeholder="狙い"
            value={form.goal || ""}
            onChange={onChange}
          />

          <select name="status" value={form.status} onChange={onChange}>
            <option value="draft">draft</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingVideoId ? "更新" : "追加"}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
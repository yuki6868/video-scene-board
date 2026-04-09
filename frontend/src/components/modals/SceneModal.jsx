import SceneAssetSection from "../scene/SceneAssetSection";

function getTaskStatusClassName(status) {
  switch (status) {
    case "未着手":
      return "task-badge task-status-todo";
    case "作業中":
      return "task-badge task-status-doing";
    case "完了":
      return "task-badge task-status-done";
    default:
      return "task-badge";
  }
}

export default function SceneModal({
  isOpen,
  form,
  videoId,
  editingSceneId,
  onChange,
  onSubmit,
  onClose,
  loadTasks,
  tasks,
  handleUpdateTaskStatus,
}) {

  const sceneTasks = (tasks ?? []).filter(
    (task) => task.scene_id === editingSceneId
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingSceneId ? "シーン編集" : "シーン追加"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="scene-form modal-form" onSubmit={onSubmit}>
          <input
            name="title"
            placeholder="タイトル"
            value={form.title}
            onChange={onChange}
            required
          />

          <textarea
            name="script"
            placeholder="台本"
            value={form.script}
            onChange={onChange}
            rows={8}
          />

          <textarea
            name="materials"
            placeholder="素材"
            value={form.materials}
            onChange={onChange}
            rows={6}
          />

          <select
            name="section_type"
            value={form.section_type || ""}
            onChange={onChange}
          >
            <option value="">選択</option>
            <option value="導入">導入</option>
            <option value="展開">展開</option>
            <option value="対立">対立</option>
            <option value="オチ">オチ</option>
          </select>

          <select name="status" value={form.status} onChange={onChange}>
            <option value="未着手">未着手</option>
            <option value="作業中">作業中</option>
            <option value="完了">完了</option>
          </select>

          <input
            name="duration_seconds"
            type="number"
            placeholder="秒数"
            value={form.duration_seconds || ""}
            onChange={onChange}
          />

          <input
            name="character_name"
            placeholder="キャラ名"
            value={form.character_name || ""}
            onChange={onChange}
          />
          <input
            name="character_expression"
            placeholder="表情"
            value={form.character_expression || ""}
            onChange={onChange}
          />

          <input
            name="audio_path"
            placeholder="音声パス"
            value={form.audio_path || ""}
            onChange={onChange}
          />
          <input
            name="background_path"
            placeholder="背景パス"
            value={form.background_path || ""}
            onChange={onChange}
          />
          <input
            name="se_path"
            placeholder="SEパス"
            value={form.se_path || ""}
            onChange={onChange}
          />

          <textarea
            name="telop"
            placeholder="テロップ"
            value={form.telop || ""}
            onChange={onChange}
          />
          <textarea
            name="direction"
            placeholder="演出指示"
            value={form.direction || ""}
            onChange={onChange}
          />
          <textarea
            name="edit_note"
            placeholder="編集メモ"
            value={form.edit_note || ""}
            onChange={onChange}
          />

          <SceneAssetSection
            editingSceneId={editingSceneId}
            videoId={videoId}
            loadTasks={loadTasks}
          />

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingSceneId ? "更新" : "追加"}
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
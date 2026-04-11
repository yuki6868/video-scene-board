function VideoModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onChange,
  editingVideoId,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{editingVideoId !== null ? "動画を編集" : "動画を追加"}</h2>

        <div className="form-group">
          <label>タイトル</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="動画タイトル"
          />
        </div>

        <div className="form-group">
          <label>サムネイルURL</label>
          <input
            type="text"
            name="thumbnail_url"
            value={form.thumbnail_url}
            onChange={onChange}
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label>説明文</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="YouTube説明文"
            rows="5"
          />
        </div>

        <div className="form-group">
          <label>タグ</label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={onChange}
            placeholder="法律, 判例, ずんだもん"
          />
        </div>

        <div className="form-group">
          <label>動画ファイルパス</label>
          <input
            type="text"
            name="video_path"
            value={form.video_path}
            onChange={onChange}
            placeholder="/Users/xxx/movie.mp4"
          />
        </div>

        <div className="form-group">
          <label>YouTube URL</label>
          <input
            type="text"
            name="youtube_url"
            value={form.youtube_url}
            onChange={onChange}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div className="form-group">
          <label>YouTube ID</label>
          <input
            type="text"
            name="youtube_id"
            value={form.youtube_id}
            onChange={onChange}
            placeholder="abcd1234xyz"
          />
        </div>

        <div className="form-group">
          <label>投稿日</label>
          <input
            type="datetime-local"
            name="published_at"
            value={form.published_at}
            onChange={onChange}
          />
        </div>

        <div className="form-group">
          <label>コンセプト</label>
          <input
            type="text"
            name="concept"
            value={form.concept}
            onChange={onChange}
            placeholder="動画のコンセプト"
          />
        </div>

        <div className="form-group">
          <label>ターゲット</label>
          <input
            type="text"
            name="target"
            value={form.target}
            onChange={onChange}
            placeholder="想定視聴者"
          />
        </div>

        <div className="form-group">
          <label>ゴール</label>
          <input
            type="text"
            name="goal"
            value={form.goal}
            onChange={onChange}
            placeholder="この動画の目的"
          />
        </div>

        <div className="form-group">
          <label>ステータス</label>
          <select name="status" value={form.status} onChange={onChange}>
            <option value="draft">draft</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="secondary-button">
            キャンセル
          </button>
          <button type="button" onClick={onSubmit} className="primary-button">
            {editingVideoId !== null ? "更新" : "作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoModal;
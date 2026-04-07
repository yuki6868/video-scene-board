import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

const initialForm = {
  title: "",
  script: "",
  materials: "",
};

function App() {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [editingSceneId, setEditingSceneId] = useState(null);

  const loadScenes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes/`);
      if (!response.ok) {
        throw new Error("シーン一覧の取得に失敗しました");
      }
      const data = await response.json();
      setScenes(data);
      setError(null);
    } catch (err) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingSceneId(null);
  };

  const handleEdit = (scene) => {
    setForm({
      title: scene.title || "",
      script: scene.script || "",
      materials: scene.materials || "",
    });
    setEditingSceneId(scene.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingSceneId === null) {
        const response = await fetch(`${API_BASE_URL}/scenes/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            position: scenes.length,
          }),
        });

        if (!response.ok) {
          throw new Error("シーン作成に失敗しました");
        }
      } else {
        const targetScene = scenes.find((scene) => scene.id === editingSceneId);

        const response = await fetch(`${API_BASE_URL}/scenes/${editingSceneId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            position: targetScene.position,
          }),
        });

        if (!response.ok) {
          throw new Error("シーン更新に失敗しました");
        }
      }

      resetForm();
      await loadScenes();
    } catch (err) {
      alert(err.message || "保存に失敗しました");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Scene Board</h1>
        <p>1本の動画を、シーンごとのカードで管理する</p>
      </header>

      <main className="scene-board">
        <form className="scene-form" onSubmit={handleSubmit}>
          <h2>{editingSceneId === null ? "シーン追加" : "シーン編集"}</h2>

          <input
            name="title"
            placeholder="タイトル"
            value={form.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="script"
            placeholder="台本"
            value={form.script}
            onChange={handleChange}
          />

          <textarea
            name="materials"
            placeholder="素材"
            value={form.materials}
            onChange={handleChange}
          />

          <div className="form-actions">
            <button type="submit">
              {editingSceneId === null ? "追加" : "更新"}
            </button>

            {editingSceneId !== null && (
              <button
                type="button"
                className="cancel-button"
                onClick={resetForm}
              >
                キャンセル
              </button>
            )}
          </div>
        </form>

        {loading && <p>読み込み中...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && scenes.length === 0 && (
          <p>シーンがまだありません。</p>
        )}

        {!loading && !error && scenes.length > 0 && (
          <div className="scene-list">
            {scenes.map((scene) => (
              <article className="scene-card" key={scene.id}>
                <div className="scene-meta">Scene #{scene.position}</div>
                <h3>{scene.title}</h3>

                <div className="scene-section">
                  <strong>台本</strong>
                  <p>{scene.script || "未設定"}</p>
                </div>

                <div className="scene-section">
                  <strong>素材</strong>
                  <p>{scene.materials || "未設定"}</p>
                </div>

                <div className="card-actions">
                  <button type="button" onClick={() => handleEdit(scene)}>
                    編集
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
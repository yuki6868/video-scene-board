import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: "",
    script: "",
    materials: "",
  });

  // 一覧取得
  const loadScenes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/scenes/`);
      if (!response.ok) throw new Error("取得失敗");
      const data = await response.json();
      setScenes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  // 入力変更
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // 作成処理
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/scenes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          position: scenes.length, // 最後に追加
        }),
      });

      if (!response.ok) throw new Error("作成失敗");

      // フォームリセット
      setForm({
        title: "",
        script: "",
        materials: "",
      });

      // 再取得
      loadScenes();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Scene Board</h1>
      </header>

      <main className="scene-board">
        {/* 作成フォーム */}
        <form className="scene-form" onSubmit={handleSubmit}>
          <h2>シーン追加</h2>

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

          <button type="submit">追加</button>
        </form>

        {/* 一覧 */}
        {loading && <p>読み込み中...</p>}
        {error && <p className="error">{error}</p>}

        <div className="scene-list">
          {scenes.map((scene) => (
            <div className="scene-card" key={scene.id}>
              <p>#{scene.position}</p>
              <h3>{scene.title}</h3>
              <p>{scene.script}</p>
              <p>{scene.materials}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
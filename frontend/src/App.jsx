import { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScenes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/scenes/`);

        if (!response.ok) {
          throw new Error("シーン一覧の取得に失敗しました");
        }

        const data = await response.json();
        setScenes(data);
      } catch (err) {
        setError(err.message || "不明なエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    loadScenes();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Video Scene Board</h1>
        <p>1本の動画を、シーンごとのカードで管理する</p>
      </header>

      <main className="scene-board">
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
                <h2>{scene.title}</h2>

                <div className="scene-section">
                  <strong>台本</strong>
                  <p>{scene.script || "未設定"}</p>
                </div>

                <div className="scene-section">
                  <strong>素材</strong>
                  <p>{scene.materials || "未設定"}</p>
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
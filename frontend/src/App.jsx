import { useEffect, useState } from "react";
import "./App.css";

import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const API_BASE_URL = "http://127.0.0.1:8000";

const initialForm = {
  title: "",
  script: "",
  materials: "",
};

function SortableItem({ scene, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="scene-card">
      <div {...attributes} {...listeners} className="drag-handle">
        ⠿
      </div>

      <p>#{scene.position}</p>
      <h3>{scene.title}</h3>
      <p>{scene.script}</p>
      <p>{scene.materials}</p>

      <div className="card-actions">
        <button onClick={() => onEdit(scene)}>編集</button>
        <button className="delete-button" onClick={() => onDelete(scene.id)}>
          削除
        </button>
      </div>
    </div>
  );
}

function App() {
  const [scenes, setScenes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingSceneId, setEditingSceneId] = useState(null);

  const loadScenes = async () => {
    const res = await fetch(`${API_BASE_URL}/scenes/`);
    const data = await res.json();
    setScenes(data);
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);

    const newScenes = arrayMove(scenes, oldIndex, newIndex);

    // position更新
    const updated = newScenes.map((scene, index) => ({
      ...scene,
      position: index,
    }));

    setScenes(updated);

    // API送信
    await fetch(`${API_BASE_URL}/scenes/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        updated.map((s) => ({
          id: s.id,
          position: s.position,
        }))
      ),
    });
  };

  const handleEdit = (scene) => {
    setForm(scene);
    setEditingSceneId(scene.id);
  };

  const handleDelete = async (id) => {
    await fetch(`${API_BASE_URL}/scenes/${id}`, {
      method: "DELETE",
    });
    loadScenes();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingSceneId === null) {
      await fetch(`${API_BASE_URL}/scenes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          position: scenes.length,
        }),
      });
    } else {
      const target = scenes.find((s) => s.id === editingSceneId);

      await fetch(`${API_BASE_URL}/scenes/${editingSceneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          position: target.position,
        }),
      });
    }

    setForm(initialForm);
    setEditingSceneId(null);
    loadScenes();
  };

  return (
    <div className="app">
      <h1>Video Scene Board</h1>

      <form className="scene-form" onSubmit={handleSubmit}>
        <input
          placeholder="タイトル"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="台本"
          value={form.script}
          onChange={(e) => setForm({ ...form, script: e.target.value })}
        />
        <textarea
          placeholder="素材"
          value={form.materials}
          onChange={(e) => setForm({ ...form, materials: e.target.value })}
        />
        <button>{editingSceneId ? "更新" : "追加"}</button>
      </form>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={scenes.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="scene-list">
            {scenes.map((scene) => (
              <SortableItem
                key={scene.id}
                scene={scene}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";
import "./App.css";

import { DndContext, closestCenter } from "@dnd-kit/core";
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

function SortableItem({ scene, onOpenDetail, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article ref={setNodeRef} style={style} className="scene-card">
      <div className="scene-card-header">
        <button
          type="button"
          className="drag-handle"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="scene-meta">Scene #{scene.position}</span>
      </div>

      <div
        className="scene-card-body"
        onClick={() => onOpenDetail(scene)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpenDetail(scene);
        }}
      >
        <h3>{scene.title}</h3>

        <div className="scene-section">
          <strong>台本</strong>
          <p>{scene.script || "未設定"}</p>
        </div>

        <div className="scene-section">
          <strong>素材</strong>
          <p>{scene.materials || "未設定"}</p>
        </div>
      </div>

      <div className="card-actions">
        <button type="button" onClick={() => onOpenDetail(scene)}>
          詳細
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(scene.id)}
        >
          削除
        </button>
      </div>
    </article>
  );
}

function SceneModal({
  isOpen,
  form,
  editingSceneId,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
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

          <div className="form-actions">
            <button type="submit">{editingSceneId ? "更新" : "追加"}</button>
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

function App() {
  const [scenes, setScenes] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingSceneId, setEditingSceneId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadScenes = async () => {
    const res = await fetch(`${API_BASE_URL}/scenes/`);
    const data = await res.json();
    setScenes(data);
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingSceneId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openDetailModal = (scene) => {
    setForm({
      title: scene.title || "",
      script: scene.script || "",
      materials: scene.materials || "",
    });
    setEditingSceneId(scene.id);
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);

    const newScenes = arrayMove(scenes, oldIndex, newIndex);
    const updated = newScenes.map((scene, index) => ({
      ...scene,
      position: index,
    }));

    setScenes(updated);

    await fetch(`${API_BASE_URL}/scenes/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        updated.map((scene) => ({
          id: scene.id,
          position: scene.position,
        }))
      ),
    });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("このシーンを削除しますか？");
    if (!ok) return;

    await fetch(`${API_BASE_URL}/scenes/${id}`, {
      method: "DELETE",
    });

    if (editingSceneId === id) {
      closeModal();
    }

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

    closeModal();
    loadScenes();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Video Scene Board</h1>
          <p>1本の動画を、シーンごとのカードで管理する</p>
        </div>
        <button type="button" className="add-scene-button" onClick={openCreateModal}>
          ＋ シーン追加
        </button>
      </header>

      <main className="scene-board">
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
                  onOpenDetail={openDetailModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      <SceneModal
        isOpen={isModalOpen}
        form={form}
        editingSceneId={editingSceneId}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </div>
  );
}

export default App;
# Video Scene Board

1本の動画を、シーンごとのカードで設計・管理し、さらにTODOタスクもステータスごとに管理できるアプリです。

## 概要
このアプリは以下を目的としています。

- 動画の構成（シーン）をカード形式で管理
- シーンの並び替え（ドラッグ＆ドロップ）
- 動画制作のTODOをカンバン形式で管理
- 複数動画を横断して管理

## 技術構成

- Frontend: React + Vite
- Backend: FastAPI
- Database: SQLite
- Drag & Drop: dnd-kit

## 主な機能

### 動画管理

- 動画の作成 / 編集 / 削除
- ステータス管理（draft / in_progress / done）
- コンセプト・ターゲット・ゴールの設定

### シーン管理

- シーンの作成 / 編集 / 削除
- ドラッグ＆ドロップによる並び替え
- 台本 / 素材 / キャラ / 秒数 / メモ管理

### TODO管理

- 未着手 / 作業中 / 完了
- 優先度（高 / 中 / 低）
- シーン紐付け
- ドラッグ＆ドロップでステータス変更

## 今後

- レイアウト改善
- UX改善
- 検索機能
- デスクトップ化

## コミット方針

- feat: 機能追加
- fix: バグ修正
- style: UI/CSS修正
- refactor: 構造改善

## VOICEVOX音声生成セットアップメモ

### ■ 概要

本アプリでは VOICEVOX を用いて音声生成を行う。
そのため、以下の3種類が必要になる。

* Pythonパッケージ（voicevox_core）
* 実行用ライブラリ（onnxruntime）
* 音声モデル・辞書（.vvm / open_jtalk）

---

### ■ 注意（重要）

`voicevox-core` は PyPI から通常の `pip install` ではインストールできない。
GitHub Releases の **wheelファイルを直接インストールする必要がある。**

---

### ■ requirements.txt

```txt
fastapi
uvicorn[standard]
pillow
```

※ voicevox-core はここには書かない

---

### ■ インストール手順（Mac / arm64 / Python3.10）

```bash
python -m pip install "https://github.com/VOICEVOX/voicevox_core/releases/download/0.16.4/voicevox_core-0.16.4-cp310-abi3-macosx_11_0_arm64.whl"
```

---

### ■ 動作確認

```bash
python -c "import voicevox_core; print('voicevox_core import ok')"
python -c "from voicevox_core.blocking import Synthesizer; print('blocking import ok')"
```

---

### ■ 必要なファイル配置

以下の構成になるように配置する。

```
backend/
├── app/
│   └── services/
│       └── voice_service.py
│
├── voicevox_core/
│   ├── onnxruntime/
│   │   └── lib/
│   │       └── libvoicevox_onnxruntime.1.17.3.dylib
│   │
│   ├── dict/
│   │   └── open_jtalk_dic_utf_8-1.11/
│   │
│   └── models/
│       └── vvms/
│           ├── 0.vvm
│           ├── 4.vvm
│           ├── 5.vvm
│           └── 10.vvm
```

---

### ■ ファイルの入手方法

VOICEVOX公式アプリをダウンロードし、中身からコピーする。

```
VOICEVOX.app/Contents/Resources/
```

中から以下を取得：

* voicevox_core/
* open_jtalk_dic_utf_8-1.11/
* vvms/

---

### ■ 動作テスト

```python
from pathlib import Path
from app.services.voice_service import generate_voice_file

generate_voice_file(
    text="テストなのだ",
    style_id=3,
    output_dir=Path("outputs")
)
```

---

### ■ 補足

* style_id → キャラと話し方を決定
* vvm → 音声モデル本体

両方が一致しないと音声生成できない

---

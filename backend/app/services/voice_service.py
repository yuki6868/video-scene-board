from pathlib import Path
import re

from voicevox_core.blocking import (
    Onnxruntime,
    OpenJtalk,
    Synthesizer,
    VoiceModelFile
)

# =========================
# 話者情報（既存流用）
# =========================
SPEAKER_STYLES = [
    {"name": "めたん", "style": "あまあま", "style_id": 0, "vvm": 0},
    {"name": "ずんだもん", "style": "あまあま", "style_id": 1, "vvm": 0},
    {"name": "めたん", "style": "ノーマル", "style_id": 2, "vvm": 0},
    {"name": "ずんだもん", "style": "ノーマル", "style_id": 3, "vvm": 0},
    {"name": "めたん", "style": "セクシー", "style_id": 4, "vvm": 0},
    {"name": "ずんだもん", "style": "セクシー", "style_id": 5, "vvm": 0},
    {"name": "めたん", "style": "ツンツン", "style_id": 6, "vvm": 0},
    {"name": "ずんだもん", "style": "ツンツン", "style_id": 7, "vvm": 0},
    {"name": "春日部つむぎ", "style": "ノーマル", "style_id": 8, "vvm": 0},

    {"name": "玄野武宏", "style": "ノーマル", "style_id": 11, "vvm": 4},
    {"name": "玄野武宏", "style": "喜び", "style_id": 39, "vvm": 10},
    {"name": "玄野武宏", "style": "ツンギレ", "style_id": 40, "vvm": 10},
    {"name": "玄野武宏", "style": "悲しみ", "style_id": 41, "vvm": 10},
    {"name": "ずんだもん", "style": "ささやき", "style_id": 22, "vvm": 5},
    {"name": "ずんだもん", "style": "ひそひそ", "style_id": 38, "vvm": 5},
]

STYLE_ID_MAP = {item["style_id"]: item for item in SPEAKER_STYLES}


def get_speaker_info(style_id: int) -> dict:
    speaker_info = STYLE_ID_MAP.get(style_id)
    if speaker_info is None:
        raise ValueError(f"未登録の style_id: {style_id}")
    return speaker_info


def sanitize_filename(text: str, max_len: int = 10) -> str:
    text = text[:max_len]
    text = re.sub(r'[\\/:*?"<>|]', "_", text)
    return text.strip() or "blank"


# =========================
# 初期化（1回だけ）
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent.parent

onnxruntime_path = BASE_DIR / "voicevox_core/onnxruntime/lib/libvoicevox_onnxruntime.1.17.3.dylib"
dict_dir = BASE_DIR / "voicevox_core/dict/open_jtalk_dic_utf_8-1.11"

ort = Onnxruntime.load_once(filename=str(onnxruntime_path))
ojt = OpenJtalk(str(dict_dir))
synthesizer = Synthesizer(ort, ojt)


# =========================
# メイン関数（これが今回の主役）
# =========================
def generate_voice_file(
    text: str,
    style_id: int,
    output_dir: Path,
    speed: float = 1.0,
    pitch: float = 0.0,
    intonation: float = 1.0,
    volume: float = 1.0,
) -> dict:

    speaker_info = get_speaker_info(style_id)
    chara = speaker_info["name"]
    style = speaker_info["style"]
    vvm_number = speaker_info["vvm"]

    model_path = BASE_DIR / f"voicevox_core/models/vvms/{vvm_number}.vvm"

    # モデル読み込み
    model = VoiceModelFile.open(str(model_path))
    synthesizer.load_voice_model(model)

    # 出力ディレクトリ
    voice_dir = output_dir / "voice_wav"
    voice_dir.mkdir(parents=True, exist_ok=True)

    safe_text = sanitize_filename(text)
    filename = f"{chara[:1]}_{style}_{safe_text}.wav"
    output_path = voice_dir / filename

    # 音声生成
    audio_query = synthesizer.create_audio_query(text, style_id)

    audio_query.speed_scale = speed
    audio_query.pitch_scale = pitch
    audio_query.intonation_scale = intonation
    audio_query.volume_scale = volume

    wav = synthesizer.synthesis(audio_query, style_id)

    with open(output_path, "wb") as f:
        f.write(wav)

    return {
        "file_path": str(output_path),
        "character": chara,
        "style": style,
        "style_id": style_id
    }
from pathlib import Path
import os
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont

# =========================
# デフォルト設定
# =========================
DEFAULT_SUBTITLE_SETTINGS = {
    "width": 1080,
    "height": 1920,
    "font_size": 64,
    "bottom_margin": 170,
    "stroke_width": 8,
    "max_chars_per_line": 16,
    "line_spacing": 18,
    "shadow_offset_x": 3,
    "shadow_offset_y": 3,
    "shadow_alpha": 160,
}

# =========================
# 話者情報
# 音声生成側と合わせる
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

CHARACTER_COLORS = {
    "ずんだもん": "#7ED957",
    "めたん": "#C2185B",
    "春日部つむぎ": "#FFD54F",
    "玄野武宏": "#2C3E50",
    "unknown": "#FFFFFF",
}

FONT_CANDIDATES = [
    "./fonts/BIZ-UDGothicB.ttc",
    "./fonts/NotoSansJP-Bold.otf",
    "./fonts/NotoSansCJK-Bold.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]


def get_speaker_info(style_id: int) -> dict:
    speaker_info = STYLE_ID_MAP.get(style_id)
    if speaker_info is None:
        raise ValueError(f"未登録の style_id です: {style_id}")
    return speaker_info


def character_to_color(character: str) -> str:
    return CHARACTER_COLORS.get(character, CHARACTER_COLORS["unknown"])


def hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        raise ValueError(f"不正な色コードです: {hex_color}")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


def resolve_font(font_size: int) -> ImageFont.FreeTypeFont:
    for font_path in FONT_CANDIDATES:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, font_size)
            except Exception:
                pass

    raise FileNotFoundError(
        "使用可能な日本語フォントが見つかりませんでした。"
        " FONT_CANDIDATES に使いたいフォントパスを追加してください。"
    )


def wrap_text(text: str, max_chars_per_line: int) -> str:
    if not text:
        return text

    wrapped = textwrap.wrap(
        text,
        width=max_chars_per_line,
        break_long_words=True,
        break_on_hyphens=False,
    )
    return "\n".join(wrapped)


def sanitize_filename(text: str, max_len: int = 10) -> str:
    text = text[:max_len]
    text = re.sub(r'[\\/:*?"<>|]', "_", text)
    return text.strip() or "blank"


def make_output_dir(base_output_dir: Path) -> Path:
    subtitle_dir = base_output_dir / "subtitles_png"
    subtitle_dir.mkdir(parents=True, exist_ok=True)
    return subtitle_dir


def draw_text_with_effects(
    image: Image.Image,
    text: str,
    font: ImageFont.FreeTypeFont,
    text_color_rgba: tuple[int, int, int, int],
    stroke_width: int,
    line_spacing: int,
    bottom_margin: int,
    shadow_offset_x: int,
    shadow_offset_y: int,
    shadow_alpha: int,
) -> None:
    draw = ImageDraw.Draw(image)

    text_bbox = draw.multiline_textbbox(
        (0, 0),
        text,
        font=font,
        spacing=line_spacing,
        align="center",
        stroke_width=stroke_width,
    )

    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    img_w, img_h = image.size
    x = (img_w - text_width) / 2
    y = img_h - bottom_margin - text_height

    shadow_fill = (0, 0, 0, shadow_alpha)
    draw.multiline_text(
        (x + shadow_offset_x, y + shadow_offset_y),
        text,
        font=font,
        fill=shadow_fill,
        spacing=line_spacing,
        align="center",
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, shadow_alpha),
    )

    draw.multiline_text(
        (x, y),
        text,
        font=font,
        fill=text_color_rgba,
        spacing=line_spacing,
        align="center",
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, 255),
    )


def create_subtitle_png(
    text: str,
    output_path: Path,
    text_color_hex: str,
    subtitle_settings: dict,
) -> None:
    width = subtitle_settings["width"]
    height = subtitle_settings["height"]
    font_size = subtitle_settings["font_size"]
    bottom_margin = subtitle_settings["bottom_margin"]
    stroke_width = subtitle_settings["stroke_width"]
    max_chars_per_line = subtitle_settings["max_chars_per_line"]
    line_spacing = subtitle_settings["line_spacing"]
    shadow_offset_x = subtitle_settings["shadow_offset_x"]
    shadow_offset_y = subtitle_settings["shadow_offset_y"]
    shadow_alpha = subtitle_settings["shadow_alpha"]

    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    font = resolve_font(font_size)

    wrapped_text = wrap_text(text, max_chars_per_line)
    text_color_rgba = hex_to_rgba(text_color_hex)

    draw_text_with_effects(
        image=image,
        text=wrapped_text,
        font=font,
        text_color_rgba=text_color_rgba,
        stroke_width=stroke_width,
        line_spacing=line_spacing,
        bottom_margin=bottom_margin,
        shadow_offset_x=shadow_offset_x,
        shadow_offset_y=shadow_offset_y,
        shadow_alpha=shadow_alpha,
    )

    image.save(output_path)


def build_subtitle_settings(subtitle_settings: dict | None = None) -> dict:
    settings = DEFAULT_SUBTITLE_SETTINGS.copy()
    if subtitle_settings:
        settings.update(subtitle_settings)
    return settings


def generate_subtitle_png(
    text: str,
    style_id: int,
    output_dir: Path,
    subtitle_settings: dict | None = None,
) -> dict:
    speaker_info = get_speaker_info(style_id)
    character = speaker_info["name"]
    style = speaker_info["style"]
    color_hex = character_to_color(character)

    settings = build_subtitle_settings(subtitle_settings)
    subtitle_dir = make_output_dir(output_dir)

    safe_text = sanitize_filename(text)
    filename = f"{character[:1]}_{style}_{safe_text}.png"
    output_path = subtitle_dir / filename

    create_subtitle_png(
        text=text,
        output_path=output_path,
        text_color_hex=color_hex,
        subtitle_settings=settings,
    )

    return {
        "file_path": str(output_path),
        "character": character,
        "style": style,
        "style_id": style_id,
        "color": color_hex,
    }
import os
import io
import tempfile
import pymupdf as fitz
from PIL import Image, ImageDraw
import streamlit as st

# ==============================================================================
# PAGE CONFIGURATION & ADOBE ACROBAT THEME STYLING
# ==============================================================================
st.set_page_config(
    page_title="Adobe Acrobat Studio | PDF Content Editor",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="expanded"
)

def apply_custom_css():
    st.markdown("""
        <style>
        /* Base typography & Adobe Acrobat Dark/Light Theme */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        html, body, [class*="css"] {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Sidebar Styling inspired by Acrobat Pro */
        [data-testid="stSidebar"] {
            background-color: #17181c !important;
            border-right: 1px solid #2d3139;
        }
        [data-testid="stSidebar"] .block-container {
            padding-top: 1.5rem;
            padding-bottom: 2rem;
        }
        [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3, [data-testid="stSidebar"] p, [data-testid="stSidebar"] span {
            color: #e2e8f0;
        }

        /* Acrobat Header Banner */
        .acrobat-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            background: linear-gradient(135deg, #1e2025 0%, #2b2e36 100%);
            border-radius: 8px;
            border-left: 4px solid #eb1000;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .acrobat-header-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
            letter-spacing: -0.3px;
        }
        .acrobat-header-sub {
            font-size: 0.75rem;
            color: #94a3b8;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Acrobat Red Button Highlights */
        .stButton>button {
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.88rem;
            transition: all 0.15s ease-in-out;
            border: 1px solid transparent;
        }
        .primary-action-btn button {
            background-color: #eb1000 !important;
            color: #ffffff !important;
            border: 1px solid #c70d00 !important;
        }
        .primary-action-btn button:hover {
            background-color: #ff2d1e !important;
            box-shadow: 0 4px 12px rgba(235, 16, 0, 0.35);
        }

        /* Stat & Info Badges */
        .acrobat-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.3px;
            margin-right: 6px;
        }
        .badge-red { background: rgba(235, 16, 0, 0.15); color: #ff5247; border: 1px solid rgba(235, 16, 0, 0.3); }
        .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-gray { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }

        /* Document Preview Card */
        .preview-container {
            background: #23272e;
            border: 1px solid #363b45;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        }

        /* Inspection Cards */
        .panel-card {
            background: #1c1f26;
            border: 1px solid #2e333d;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 14px;
        }
        .panel-card-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Extracted text code block styling */
        .extracted-text-box {
            max-height: 220px;
            overflow-y: auto;
            background: #131418;
            border: 1px solid #282c34;
            border-radius: 6px;
            padding: 10px 14px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 0.8rem;
            color: #cbd5e1;
            white-space: pre-wrap;
            line-height: 1.45;
        }

        /* Tabs styling */
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
            border-bottom: 2px solid #2d3139;
        }
        .stTabs [data-baseweb="tab"] {
            padding: 8px 16px;
            border-radius: 6px 6px 0 0;
            font-weight: 600;
            font-size: 0.88rem;
        }
        </style>
    """, unsafe_allow_html=True)

# ==============================================================================
# UTILITY FUNCTIONS: COLOR, FONTS, GEOMETRY & CONVERSIONS
# ==============================================================================

def int_to_rgb(color_int):
    """Convert PyMuPDF integer color (0xRRGGBB) to (r, g, b) float tuple in [0, 1]."""
    if not isinstance(color_int, int):
        return (0.0, 0.0, 0.0)
    r = ((color_int >> 16) & 0xFF) / 255.0
    g = ((color_int >> 8) & 0xFF) / 255.0
    b = (color_int & 0xFF) / 255.0
    return (r, g, b)

def rgb_to_hex(r, g, b):
    """Convert RGB float tuple [0, 1] to hex string #RRGGBB."""
    ri = int(round(max(0.0, min(1.0, r)) * 255))
    gi = int(round(max(0.0, min(1.0, g)) * 255))
    bi = int(round(max(0.0, min(1.0, b)) * 255))
    return f"#{ri:02x}{gi:02x}{bi:02x}"

def hex_to_rgb(hex_str):
    """Convert hex string #RRGGBB to RGB float tuple [0, 1]."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        return (0.0, 0.0, 0.0)
    try:
        r = int(hex_str[0:2], 16) / 255.0
        g = int(hex_str[2:4], 16) / 255.0
        b = int(hex_str[4:6], 16) / 255.0
        return (r, g, b)
    except ValueError:
        return (0.0, 0.0, 0.0)

def map_font_family(font_str, is_bold=False, is_italic=False, flags=0):
    """
    Map arbitrary PDF font names or user choices to one of the 14 standard
    PDF base-14 fonts natively supported by PyMuPDF without requiring font files.
    """
    f = (font_str or "").lower()
    b = is_bold or ("bold" in f) or (flags & 2 != 0) or ("black" in f) or ("heavy" in f)
    i = is_italic or ("italic" in f) or ("oblique" in f) or (flags & 1 != 0)
    serif = ("times" in f) or ("serif" in f) or ("roman" in f) or ("georgia" in f)
    mono = ("courier" in f) or ("mono" in f) or ("consolas" in f) or ("typewriter" in f)

    if mono:
        if b and i: return "cobi"
        if b: return "cobo"
        if i: return "coit"
        return "cour"
    elif serif:
        if b and i: return "tibi"
        if b: return "tibo"
        if i: return "tiit"
        return "tiro"
    else:
        # Default: Helvetica / Sans-serif
        if b and i: return "hebi"
        if b: return "hebo"
        if i: return "heit"
        return "helv"

# ==============================================================================
# SAMPLE PDF GENERATOR (FOR IMMEDIATE OUT-OF-THE-BOX TESTING)
# ==============================================================================

def create_sample_pdf_bytes():
    """Generate a realistic, professional multi-page sample PDF with text and images."""
    doc = fitz.open()

    # --- PAGE 1: Corporate Quarterly Report ---
    p1 = doc.new_page(width=595, height=842) # Standard A4
    
    # Header Bar
    p1.draw_rect(fitz.Rect(0, 0, 595, 24), color=None, fill=(0.12, 0.14, 0.18))
    p1.insert_text((40, 65), "ACME GLOBAL ENTERPRISES", fontsize=22, fontname="hebo", color=(0.15, 0.20, 0.30))
    p1.insert_text((40, 88), "Quarterly Financial Performance & Operations Review", fontsize=12, fontname="helv", color=(0.45, 0.50, 0.58))
    p1.insert_text((40, 115), "Document ID: ACME-2026-Q1 | Classification: Internal Confidential", fontsize=9, fontname="tiit", color=(0.5, 0.5, 0.5))
    
    # Section 1
    p1.insert_text((40, 155), "1. Executive Summary & Revenue Targets", fontsize=15, fontname="hebo", color=(0.88, 0.10, 0.10))
    p1.insert_text((40, 180), "In the first quarter of 2026, ACME recorded a total revenue of $4,250,000.", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    p1.insert_text((40, 200), "Our core operating margin reached 28.5%, surpassing our initial forecast.", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    p1.insert_text((40, 220), "Total recurring subscriptions grew by 3,400 active client accounts.", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))

    # Performance Chart Image
    chart_img = Image.new("RGB", (440, 180), color=(248, 250, 252))
    draw = ImageDraw.Draw(chart_img)
    draw.rectangle([(10, 10), (430, 170)], outline=(226, 232, 240), width=2)
    # Chart bars
    draw.rectangle([(40, 110), (90, 155)], fill=(59, 130, 246))   # Q1
    draw.rectangle([(130, 85), (180, 155)], fill=(16, 185, 129))  # Q2
    draw.rectangle([(220, 60), (270, 155)], fill=(245, 158, 11))  # Q3
    draw.rectangle([(310, 35), (360, 155)], fill=(235, 16, 0))    # Q4
    draw.text((25, 22), "Regional Revenue Trajectory ($M)", fill=(30, 41, 59))
    
    chart_buf = io.BytesIO()
    chart_img.save(chart_buf, format="PNG")
    p1.insert_image(fitz.Rect(40, 245, 480, 425), stream=chart_buf.getvalue())

    # Section 2
    p1.insert_text((40, 460), "2. Strategic Priorities & Next Milestones", fontsize=15, fontname="hebo", color=(0.88, 0.10, 0.10))
    p1.insert_text((40, 485), "We are finalizing international expansion plans into Tokyo and Berlin.", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    p1.insert_text((40, 505), "Product development budget is fixed at $950,000 for the upcoming cycle.", fontsize=11, fontname="helv", color=(0.1, 0.1, 0.1))
    p1.insert_text((40, 525), "Please direct all compliance questions to legal@acmeglobal.com.", fontsize=11, fontname="tiro", color=(0.15, 0.35, 0.75))

    # --- PAGE 2: Approval & Verification ---
    p2 = doc.new_page(width=595, height=842)
    p2.draw_rect(fitz.Rect(0, 0, 595, 24), color=None, fill=(0.12, 0.14, 0.18))
    p2.insert_text((40, 65), "AUDIT & EXECUTIVE SIGN-OFF", fontsize=20, fontname="hebo", color=(0.15, 0.20, 0.30))
    p2.insert_text((40, 95), "Signatory Authority: Jane Smith, Chief Financial Officer", fontsize=12, fontname="tiro", color=(0.2, 0.2, 0.2))
    p2.insert_text((40, 120), "Audit Status: VERIFIED AND APPROVED", fontsize=12, fontname="hebo", color=(0.1, 0.6, 0.2))
    p2.insert_text((40, 145), "Effective Verification Date: March 31, 2026", fontsize=11, fontname="helv", color=(0.3, 0.3, 0.3))

    # Badge/Seal Image
    seal_img = Image.new("RGB", (220, 90), color=(254, 242, 242))
    sdraw = ImageDraw.Draw(seal_img)
    sdraw.rectangle([(4, 4), (215, 85)], outline=(220, 38, 38), width=3)
    sdraw.text((45, 35), "OFFICIAL SEAL - ACME", fill=(220, 38, 38))
    seal_buf = io.BytesIO()
    seal_img.save(seal_buf, format="PNG")
    p2.insert_image(fitz.Rect(320, 80, 520, 160), stream=seal_buf.getvalue())

    p2.insert_text((40, 200), "Notice: Any unauthorized alteration of this PDF is strictly prohibited.", fontsize=10, fontname="tiit", color=(0.5, 0.5, 0.5))

    pdf_bytes = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return pdf_bytes

# ==============================================================================
# PERSISTENCE & FILE STORAGE HELPERS (NEVER OVERWRITING original.pdf)
# ==============================================================================

OUTPUT_DIR = "output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "edited.pdf")

def save_edited_pdf_to_disk(pdf_bytes):
    """
    Save all changes strictly to output/edited.pdf without touching original.pdf.
    Includes fallback if OneDrive / local permissions require writing to temp.
    """
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(OUTPUT_FILE, "wb") as f:
            f.write(pdf_bytes)
        return OUTPUT_FILE
    except Exception as e:
        # Fallback to system temp folder if workspace permissions restrict writing
        fallback_path = os.path.join(tempfile.gettempdir(), "edited.pdf")
        with open(fallback_path, "wb") as f:
            f.write(pdf_bytes)
        return fallback_path

# ==============================================================================
# CORE EDITING ENGINE (PYMUPDF / FITZ)
# ==============================================================================

def get_page_extracted_text(doc, page_num):
    """Extract plain text and structured blocks from the requested page."""
    if page_num < 0 or page_num >= len(doc):
        return "", []
    page = doc[page_num]
    raw_text = page.get_text("text")
    blocks_data = []
    text_dict = page.get_text("dict")
    for b in text_dict.get("blocks", []):
        if "lines" in b:
            for line in b["lines"]:
                for s in line.get("spans", []):
                    txt = s.get("text", "").strip()
                    if txt:
                        blocks_data.append({
                            "text": txt,
                            "bbox": s.get("bbox"),
                            "size": round(s.get("size", 11.0), 1),
                            "font": s.get("font", "helv"),
                            "color": s.get("color", 0)
                        })
    return raw_text, blocks_data

def find_text_occurrences(page, search_text):
    """Find all bounding boxes matching the exact search string on a page."""
    if not search_text:
        return []
    return page.search_for(search_text)

def perform_text_edit(
    doc,
    page_num,
    search_text,
    replacement_text,
    delete_only=False,
    replace_all=True,
    auto_style=True,
    custom_font="helv",
    custom_size=12.0,
    custom_color=(0.0, 0.0, 0.0),
    alignment="Left",
    white_fill=True
):
    """
    Executes existing text replacement or deletion using PDF redactions.
    1. Searches for the exact text on the page.
    2. Detects original font size, color, baseline origin and mapped font.
    3. Redacts the target text cleanly.
    4. Inserts the replacement text at the same coordinate position.
    """
    if page_num < 0 or page_num >= len(doc):
        return False, f"Page {page_num + 1} does not exist."
    
    if not search_text or search_text.strip() == "":
        return False, "Search text cannot be empty."

    page = doc[page_num]
    rects = page.search_for(search_text)
    
    if not rects:
        return False, f"Text '{search_text}' was not found on Page {page_num + 1}."

    # Decide targets: all occurrences or first occurrence
    targets = rects if replace_all else [rects[0]]

    # Inspect text dict to find typography details from overlapping spans
    page_dict = page.get_text("dict")

    fill_color = (1.0, 1.0, 1.0) if white_fill else None

    edits_applied = 0
    for target_rect in targets:
        detected_size = 11.0
        detected_color = (0.0, 0.0, 0.0)
        detected_font = "helv"
        detected_baseline = target_rect.y1 - (target_rect.y1 - target_rect.y0) * 0.22

        # Check overlapping span in dict
        found_span = False
        for b in page_dict.get("blocks", []):
            if "lines" in b:
                for line in b["lines"]:
                    for s in line.get("spans", []):
                        s_rect = fitz.Rect(s["bbox"])
                        if target_rect.intersects(s_rect):
                            detected_size = float(s.get("size", 11.0))
                            detected_color = int_to_rgb(s.get("color", 0))
                            detected_font = map_font_family(s.get("font", "helv"), flags=s.get("flags", 0))
                            origin = s.get("origin")
                            if origin and len(origin) == 2:
                                detected_baseline = origin[1]
                            found_span = True
                            break
                    if found_span: break
            if found_span: break

        # Apply redaction
        page.add_redact_annot(target_rect, fill=fill_color)
        page.apply_redactions()

        # If not delete_only and replacement text is provided, insert replacement
        if not delete_only and replacement_text is not None and replacement_text != "":
            font_to_use = detected_font if auto_style else custom_font
            size_to_use = detected_size if auto_style else custom_size
            color_to_use = detected_color if auto_style else custom_color

            # Handle multi-line replacement text
            lines = replacement_text.splitlines()
            if not lines:
                lines = [replacement_text]
            
            line_height = size_to_use * 1.25
            for i, line in enumerate(lines):
                # Calculate horizontal alignment
                text_len = fitz.get_text_length(line, fontname=font_to_use, fontsize=size_to_use)
                rect_w = target_rect.x1 - target_rect.x0
                
                if alignment == "Center":
                    start_x = target_rect.x0 + max(0.0, (rect_w - text_len) / 2.0)
                elif alignment == "Right":
                    start_x = max(target_rect.x0, target_rect.x1 - text_len)
                else: # Left
                    start_x = target_rect.x0

                curr_baseline = detected_baseline + (i * line_height)
                page.insert_text(
                    (start_x, curr_baseline),
                    line,
                    fontname=font_to_use,
                    fontsize=size_to_use,
                    color=color_to_use
                )
        
        edits_applied += 1

    action_name = "deleted" if (delete_only or not replacement_text) else "replaced"
    return True, f"Successfully {action_name} {edits_applied} occurrence(s) of '{search_text}' on Page {page_num + 1}."

def get_page_images(doc, page_num):
    """
    Detect all valid existing images placed on a page.
    Returns list of metadata dicts including xref, bbox, dimensions and thumbnail.
    """
    if page_num < 0 or page_num >= len(doc):
        return []
    page = doc[page_num]
    raw_infos = page.get_image_info(xrefs=True)
    images = []

    for idx, info in enumerate(raw_infos):
        xref = info.get("xref", 0)
        if xref <= 0:
            continue
        width = info.get("width", 0)
        height = info.get("height", 0)
        # Filter out 1x1 invisible masks or degenerate stamps
        if width <= 1 and height <= 1:
            continue
        
        bbox = info.get("bbox", ())
        if not bbox or len(bbox) != 4:
            continue

        # Extract image thumbnail
        thumb_img = None
        ext = "png"
        try:
            extracted = doc.extract_image(xref)
            if extracted and "image" in extracted:
                thumb_img = Image.open(io.BytesIO(extracted["image"]))
                ext = extracted.get("ext", "png")
        except Exception:
            thumb_img = None

        images.append({
            "index": idx,
            "page": page_num,
            "xref": xref,
            "bbox": fitz.Rect(bbox),
            "width": width,
            "height": height,
            "thumbnail": thumb_img,
            "ext": ext
        })
    return images

def perform_image_replacement(doc, page_num, xref, bbox, replacement_bytes, keep_aspect=True):
    """
    Replace an existing image in its original position.
    Preserves dimensions and aspect ratio according to keep_aspect.
    """
    if page_num < 0 or page_num >= len(doc):
        return False, "Invalid page number."
    
    page = doc[page_num]

    try:
        # Delete the previous image stream at xref
        page.delete_image(xref)
        # Redact the bounding box to erase any background raster
        page.add_redact_annot(bbox, fill=(1.0, 1.0, 1.0))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE)

        # Insert new image in the exact original placement rect
        page.insert_image(bbox, stream=replacement_bytes, keep_proportion=keep_aspect)
        return True, f"Image (xref {xref}) successfully replaced on Page {page_num + 1}."
    except Exception as e:
        return False, f"Failed to replace image: {str(e)}"

def perform_image_deletion(doc, page_num, xref, bbox):
    """Delete an existing image from the page."""
    if page_num < 0 or page_num >= len(doc):
        return False, "Invalid page number."
    
    page = doc[page_num]
    try:
        page.delete_image(xref)
        page.add_redact_annot(bbox, fill=(1.0, 1.0, 1.0))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE)
        return True, f"Image (xref {xref}) deleted from Page {page_num + 1}."
    except Exception as e:
        return False, f"Failed to delete image: {str(e)}"

def perform_add_new_image(doc, page_num, new_img_bytes, target_rect, keep_aspect=True):
    """Insert a new image at specified coordinates on a page."""
    if page_num < 0 or page_num >= len(doc):
        return False, "Invalid page number."
    
    page = doc[page_num]
    try:
        page.insert_image(target_rect, stream=new_img_bytes, keep_proportion=keep_aspect)
        return True, f"New image added to Page {page_num + 1} at coordinates {tuple(round(v, 1) for v in target_rect)}."
    except Exception as e:
        return False, f"Failed to add image: {str(e)}"

def render_page_preview(doc, page_num, zoom=1.5):
    """Render a PDF page as high-resolution PNG image bytes."""
    if page_num < 0 or page_num >= len(doc):
        return None
    page = doc[page_num]
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("png")

# ==============================================================================
# STREAMLIT SESSION STATE MANAGEMENT
# ==============================================================================

def initialize_session_state():
    if "original_pdf_bytes" not in st.session_state:
        st.session_state["original_pdf_bytes"] = None
    if "edited_pdf_bytes" not in st.session_state:
        st.session_state["edited_pdf_bytes"] = None
    if "pdf_filename" not in st.session_state:
        st.session_state["pdf_filename"] = None
    if "current_page" not in st.session_state:
        st.session_state["current_page"] = 0
    if "undo_stack" not in st.session_state:
        st.session_state["undo_stack"] = []
    if "zoom_level" not in st.session_state:
        st.session_state["zoom_level"] = 1.5
    if "feedback_msg" not in st.session_state:
        st.session_state["feedback_msg"] = None

def push_undo_state():
    """Save the current document bytes to the undo history stack before applying an edit."""
    if st.session_state["edited_pdf_bytes"]:
        # Keep maximum 10 undo states to preserve memory
        st.session_state["undo_stack"].append(st.session_state["edited_pdf_bytes"])
        if len(st.session_state["undo_stack"]) > 10:
            st.session_state["undo_stack"].pop(0)

def pop_undo_state():
    """Revert the document bytes to the latest state from the undo stack."""
    if st.session_state["undo_stack"]:
        previous_bytes = st.session_state["undo_stack"].pop()
        st.session_state["edited_pdf_bytes"] = previous_bytes
        save_edited_pdf_to_disk(previous_bytes)
        st.session_state["feedback_msg"] = ("info", "↩️ Reverted last edit via Undo.")
        st.rerun()

# ==============================================================================
# MAIN APPLICATION INTERFACE
# ==============================================================================

def main():
    apply_custom_css()
    initialize_session_state()

    # --------------------------------------------------------------------------
    # SIDEBAR: DOCUMENT MANAGER & NAVIGATION
    # --------------------------------------------------------------------------
    with st.sidebar:
        # Acrobat Header
        st.markdown("""
            <div class="acrobat-header">
                <div>
                    <div class="acrobat-header-title">Adobe Acrobat Studio</div>
                    <div class="acrobat-header-sub">Professional PDF Content Editor</div>
                </div>
            </div>
        """, unsafe_allow_html=True)

        st.markdown("### 📂 Document Source")
        
        # Upload using temporary file
        uploaded_file = st.file_uploader(
            "Upload PDF to Edit",
            type=["pdf"],
            help="Select any PDF document. Your original file will never be modified."
        )

        col_sample, col_reset = st.columns(2)
        with col_sample:
            if st.button("📄 Load Sample", help="Load built-in 2-page sample document with text and images"):
                sample_bytes = create_sample_pdf_bytes()
                st.session_state["original_pdf_bytes"] = sample_bytes
                st.session_state["edited_pdf_bytes"] = sample_bytes
                st.session_state["pdf_filename"] = "sample_corporate_report.pdf"
                st.session_state["current_page"] = 0
                st.session_state["undo_stack"] = []
                save_edited_pdf_to_disk(sample_bytes)
                st.session_state["feedback_msg"] = ("success", "Loaded sample PDF with text and images!")
                st.rerun()

        with col_reset:
            if st.session_state["original_pdf_bytes"] is not None:
                if st.button("🔄 Reset PDF", help="Reset all modifications back to the uploaded original"):
                    st.session_state["edited_pdf_bytes"] = st.session_state["original_pdf_bytes"]
                    st.session_state["undo_stack"] = []
                    save_edited_pdf_to_disk(st.session_state["original_pdf_bytes"])
                    st.session_state["feedback_msg"] = ("info", "Reset all edits to original document.")
                    st.rerun()

        # Handle file upload with temporary file
        if uploaded_file is not None:
            if st.session_state.get("_last_uploaded_name") != uploaded_file.name:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(uploaded_file.getvalue())
                    tmp_path = tmp.name
                
                try:
                    # Validate PDF with PyMuPDF
                    test_doc = fitz.open(tmp_path)
                    pdf_bytes = test_doc.tobytes(garbage=3, deflate=True)
                    test_doc.close()

                    st.session_state["original_pdf_bytes"] = pdf_bytes
                    st.session_state["edited_pdf_bytes"] = pdf_bytes
                    st.session_state["pdf_filename"] = uploaded_file.name
                    st.session_state["current_page"] = 0
                    st.session_state["undo_stack"] = []
                    st.session_state["_last_uploaded_name"] = uploaded_file.name
                    save_edited_pdf_to_disk(pdf_bytes)
                    st.session_state["feedback_msg"] = ("success", f"Loaded '{uploaded_file.name}' successfully.")
                except Exception as e:
                    st.error(f"Error opening uploaded PDF: {e}")
                finally:
                    if os.path.exists(tmp_path):
                        try: os.remove(tmp_path)
                        except Exception: pass
                st.rerun()

        st.markdown("---")

        # Active Document Info & History
        if st.session_state["edited_pdf_bytes"] is not None:
            doc = fitz.open(stream=st.session_state["edited_pdf_bytes"], filetype="pdf")
            total_pages = len(doc)
            fname = st.session_state.get("pdf_filename", "document.pdf")
            file_kb = len(st.session_state["edited_pdf_bytes"]) / 1024.0

            st.markdown(f"""
                <div class="panel-card">
                    <div class="panel-card-title">📑 Document Overview</div>
                    <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.6;">
                        <strong>File:</strong> {fname}<br/>
                        <strong>Pages:</strong> {total_pages}<br/>
                        <strong>Size:</strong> {file_kb:.1f} KB<br/>
                        <strong>Status:</strong> <span class="acrobat-badge badge-green">Ready to Edit</span>
                    </div>
                </div>
            """, unsafe_allow_html=True)

            # Undo Controls
            undo_count = len(st.session_state["undo_stack"])
            col_u1, col_u2 = st.columns([2, 1])
            with col_u1:
                st.caption(f"History stack: {undo_count} edit(s)")
            with col_u2:
                if st.button("↩️ Undo", disabled=(undo_count == 0), help="Undo the most recent edit"):
                    pop_undo_state()

            st.markdown("---")
            
            # Export & Download Section
            st.markdown("### 💾 Export & Download")
            st.markdown("""
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px;">
                    Changes auto-saved to <code>output/edited.pdf</code>.<br/>
                    Original file remains untouched.
                </div>
            """, unsafe_allow_html=True)

            st.download_button(
                label="📥 Download Edited PDF",
                data=st.session_state["edited_pdf_bytes"],
                file_name="edited.pdf",
                mime="application/pdf",
                help="Download the updated PDF with all text and image edits applied.",
                use_container_width=True
            )
            doc.close()
        else:
            st.info("Upload a PDF or click 'Load Sample' to begin editing.")

        # Acrobat Guidelines and Instructions
        with st.expander("ℹ️ How Acrobat Editing Works", expanded=False):
            st.markdown("""
            **PDF Architecture Notice:**
            - PDFs are fixed-coordinate vector documents, not reflowable text files like Word.
            - **Text Redaction & Replacement:** The editor searches for exact character coordinates, redacts the original vectors/glyphs, and re-inserts replacement text at matching baseline coordinates.
            - **Typography Matching:** PyMuPDF extracts the original font size, color, and closest standard PDF font.
            - **Image Replacement:** Replaces the underlying XObject or bounding box while preserving original dimensions and aspect ratio.
            """)

    # --------------------------------------------------------------------------
    # MAIN WORKSPACE: PREVIEW & EDITING SUITE
    # --------------------------------------------------------------------------
    if st.session_state["edited_pdf_bytes"] is None:
        # Welcome Hero Screen
        st.markdown("""
            <div style="text-align: center; padding: 60px 20px; background: #18191c; border-radius: 12px; border: 1px solid #2d3139; margin-top: 20px;">
                <h1 style="color: #ffffff; font-size: 2.2rem; font-weight: 700; margin-bottom: 12px;">Adobe Acrobat Studio PDF Editor</h1>
                <p style="color: #94a3b8; font-size: 1.05rem; max-width: 650px; margin: 0 auto 28px auto;">
                    Edit existing text and images directly inside your PDF documents with high-fidelity vector redaction, typography preservation, and live visual preview.
                </p>
                <div style="display: flex; justify-content: center; gap: 16px;">
                    <span class="acrobat-badge badge-red">Vector Text Redaction</span>
                    <span class="acrobat-badge badge-green">Image Replacement</span>
                    <span class="acrobat-badge badge-blue">Style Preservation</span>
                    <span class="acrobat-badge badge-gray">Safe Non-Destructive Save</span>
                </div>
            </div>
        """, unsafe_allow_html=True)
        return

    # Open working document from memory
    doc = fitz.open(stream=st.session_state["edited_pdf_bytes"], filetype="pdf")
    total_pages = len(doc)

    # Ensure current page is valid
    if st.session_state["current_page"] >= total_pages:
        st.session_state["current_page"] = max(0, total_pages - 1)
    current_page = st.session_state["current_page"]

    # Display Feedback Notification Banner
    if st.session_state["feedback_msg"]:
        msg_type, msg_text = st.session_state["feedback_msg"]
        if msg_type == "success":
            st.success(msg_text)
        elif msg_type == "error":
            st.error(msg_text)
        elif msg_type == "warning":
            st.warning(msg_text)
        else:
            st.info(msg_text)
        st.session_state["feedback_msg"] = None

    # Top Toolbar: Navigation & Controls
    tool_col1, tool_col2, tool_col3, tool_col4, tool_col5 = st.columns([1.2, 1.2, 2.2, 1.2, 1.2])

    with tool_col1:
        if st.button("⏮ First", disabled=(current_page == 0), use_container_width=True):
            st.session_state["current_page"] = 0
            st.rerun()

    with tool_col2:
        if st.button("◀ Previous", disabled=(current_page == 0), use_container_width=True):
            st.session_state["current_page"] = max(0, current_page - 1)
            st.rerun()

    with tool_col3:
        page_selection = st.selectbox(
            "Page Navigation",
            options=list(range(total_pages)),
            format_func=lambda x: f"Page {x + 1} of {total_pages}",
            index=current_page,
            label_visibility="collapsed"
        )
        if page_selection != current_page:
            st.session_state["current_page"] = page_selection
            st.rerun()

    with tool_col4:
        if st.button("Next ▶", disabled=(current_page >= total_pages - 1), use_container_width=True):
            st.session_state["current_page"] = min(total_pages - 1, current_page + 1)
            st.rerun()

    with tool_col5:
        if st.button("Last ⏭", disabled=(current_page >= total_pages - 1), use_container_width=True):
            st.session_state["current_page"] = total_pages - 1
            st.rerun()

    st.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)

    # --------------------------------------------------------------------------
    # TWO-COLUMN SPLIT: LEFT PREVIEW CANVAS | RIGHT EDITING SUITE
    # --------------------------------------------------------------------------
    col_preview, col_editor = st.columns([1.15, 1.0], gap="large")

    # ==========================================================================
    # LEFT PANEL: PDF PREVIEW CANVAS
    # ==========================================================================
    with col_preview:
        st.markdown(f"#### 📄 Page {current_page + 1} Preview")
        
        # Render high quality preview
        page_obj = doc[current_page]
        p_rect = page_obj.rect
        preview_png = render_page_preview(doc, current_page, zoom=st.session_state["zoom_level"])

        if preview_png:
            st.markdown('<div class="preview-container">', unsafe_allow_html=True)
            st.image(preview_png, use_container_width=True)
            st.markdown('</div>', unsafe_allow_html=True)
        else:
            st.error("Failed to render preview for this page.")

        # Canvas details & Zoom controls
        zoom_col1, zoom_col2 = st.columns([2, 1])
        with zoom_col1:
            st.caption(f"Dimensions: {p_rect.width:.0f} × {p_rect.height:.0f} pt | Rotation: {page_obj.rotation}°")
        with zoom_col2:
            zoom_choice = st.selectbox(
                "Zoom",
                options=[1.0, 1.5, 2.0],
                format_func=lambda z: f"{int(z*100)}% DPI",
                index=1,
                label_visibility="collapsed"
            )
            if zoom_choice != st.session_state["zoom_level"]:
                st.session_state["zoom_level"] = zoom_choice
                st.rerun()

    # ==========================================================================
    # RIGHT PANEL: ACROBAT EDITING SUITE (TABS)
    # ==========================================================================
    with col_editor:
        tab_text, tab_images, tab_inspect = st.tabs([
            "📝 Edit Existing Text",
            "🖼️ Edit Images",
            "🔍 Text Inspector"
        ])

        # ----------------------------------------------------------------------
        # TAB 1: EXISTING TEXT EDITING
        # ----------------------------------------------------------------------
        with tab_text:
            st.markdown(f"##### ✏️ Modify Page {current_page + 1} Text")
            st.markdown("""
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 12px;">
                    Enter the exact text to replace or delete. The editor redacts the target text vectors and places replacement text in the matching position.
                </div>
            """, unsafe_allow_html=True)

            search_input = st.text_input(
                "Exact Existing Text to Change *",
                placeholder="e.g. $4,250,000 or ACME GLOBAL",
                help="Enter the exact substring as it appears on this page (case-insensitive)."
            )

            # Live Occurrence Checker
            if search_input and search_input.strip():
                matches = find_text_occurrences(page_obj, search_input.strip())
                if matches:
                    st.markdown(f"<span class='acrobat-badge badge-green'>✓ Found {len(matches)} occurrence(s) on Page {current_page + 1}</span>", unsafe_allow_html=True)
                else:
                    st.markdown(f"<span class='acrobat-badge badge-red'>✗ Text not found on Page {current_page + 1}</span>", unsafe_allow_html=True)

            col_rep, col_del = st.columns([2.5, 1.5])
            with col_rep:
                replacement_input = st.text_area(
                    "Replacement Text",
                    placeholder="Enter new replacement text...",
                    help="Leave blank or check Delete to redact without replacement."
                )
            with col_del:
                st.markdown("<div style='height: 28px;'></div>", unsafe_allow_html=True)
                delete_mode = st.checkbox("Delete Text", help="Redact and remove the text without inserting anything.")

            col_all, col_fill = st.columns(2)
            with col_all:
                replace_all_occ = st.checkbox("Replace all occurrences", value=True, help="If unchecked, only replaces the first match.")
            with col_fill:
                white_bg = st.checkbox("White background fill", value=True, help="Erases anti-aliasing artifacts cleanly with white.")

            # Typography Preservation & Advanced Overrides
            with st.expander("⚙️ Typography Controls (Auto-Preserve / Override)", expanded=False):
                auto_style = st.checkbox("Auto-detect original font, size & color", value=True, help="Detects original font properties from the matching text span.")
                
                col_f1, col_f2 = st.columns(2)
                with col_f1:
                    font_family = st.selectbox(
                        "Font Family",
                        options=["helv", "tiro", "cour"],
                        format_func=lambda x: {"helv": "Helvetica / Arial (Sans)", "tiro": "Times Roman (Serif)", "cour": "Courier (Mono)"}.get(x, x),
                        disabled=auto_style
                    )
                    font_size = st.number_input("Font Size (pt)", min_value=6.0, max_value=72.0, value=11.0, step=0.5, disabled=auto_style)
                with col_f2:
                    font_color_hex = st.color_picker("Font Color", value="#000000", disabled=auto_style)
                    alignment = st.selectbox("Alignment", options=["Left", "Center", "Right"], index=0)

            # Apply Text Change Button
            st.markdown("<div class='primary-action-btn'>", unsafe_allow_html=True)
            if st.button("⚡ Apply Text Edit", use_container_width=True):
                if not search_input or not search_input.strip():
                    st.error("Please enter the exact existing text to find.")
                else:
                    # Save undo state
                    push_undo_state()
                    
                    custom_color = hex_to_rgb(font_color_hex)
                    success, msg = perform_text_edit(
                        doc=doc,
                        page_num=current_page,
                        search_text=search_input.strip(),
                        replacement_text=replacement_input if not delete_mode else None,
                        delete_only=delete_mode,
                        replace_all=replace_all_occ,
                        auto_style=auto_style,
                        custom_font=font_family,
                        custom_size=font_size,
                        custom_color=custom_color,
                        alignment=alignment,
                        white_fill=white_bg
                    )

                    if success:
                        new_bytes = doc.tobytes(garbage=3, deflate=True)
                        st.session_state["edited_pdf_bytes"] = new_bytes
                        save_edited_pdf_to_disk(new_bytes)
                        st.session_state["feedback_msg"] = ("success", msg)
                        st.rerun()
                    else:
                        st.error(msg)
            st.markdown("</div>", unsafe_allow_html=True)

        # ----------------------------------------------------------------------
        # TAB 2: EXISTING & NEW IMAGE EDITING
        # ----------------------------------------------------------------------
        with tab_images:
            subtab_exist, subtab_add = st.tabs(["🔄 Replace Existing Image", "➕ Add New Image"])

            # SUBTAB A: EXISTING IMAGES
            with subtab_exist:
                page_imgs = get_page_images(doc, current_page)
                
                if not page_imgs:
                    st.info(f"No existing images detected on Page {current_page + 1}.")
                else:
                    st.markdown(f"**Found {len(page_imgs)} image(s) on Page {current_page + 1}:**")
                    
                    img_labels = [
                        f"Image #{i+1} (xref: {im['xref']}, {im['width']}×{im['height']}px)"
                        for i, im in enumerate(page_imgs)
                    ]
                    selected_idx = st.selectbox(
                        "Select Image to Edit",
                        options=list(range(len(page_imgs))),
                        format_func=lambda i: img_labels[i]
                    )

                    selected_image_data = page_imgs[selected_idx]

                    # Show thumbnail & placement metadata
                    col_th, col_meta = st.columns([1, 1.5])
                    with col_th:
                        if selected_image_data["thumbnail"]:
                            st.image(selected_image_data["thumbnail"], caption=f"Selected Image #{selected_idx + 1}", use_container_width=True)
                        else:
                            st.caption("No preview thumbnail available.")
                    with col_meta:
                        b = selected_image_data["bbox"]
                        st.markdown(f"""
                            <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.6;">
                                <strong>Reference (xref):</strong> {selected_image_data['xref']}<br/>
                                <strong>Dimensions:</strong> {selected_image_data['width']} × {selected_image_data['height']} px<br/>
                                <strong>Position:</strong> ({b.x0:.1f}, {b.y0:.1f})<br/>
                                <strong>Bounds (W×H):</strong> {b.width:.1f} × {b.height:.1f} pt
                            </div>
                        """, unsafe_allow_html=True)

                    st.markdown("---")
                    st.markdown("##### Upload Replacement Image")
                    
                    replace_file = st.file_uploader(
                        "Choose Replacement Image File",
                        type=["png", "jpg", "jpeg", "webp"],
                        key="replace_img_uploader"
                    )

                    col_asp, col_del_img = st.columns(2)
                    with col_asp:
                        keep_aspect = st.checkbox("Preserve aspect ratio", value=True, help="Maintains proportions inside original bounding box.")
                    with col_del_img:
                        st.markdown("<div style='height: 4px;'></div>", unsafe_allow_html=True)
                        if st.button("🗑️ Delete Image", use_container_width=True, help="Remove this image from the page"):
                            push_undo_state()
                            ok, dmsg = perform_image_deletion(
                                doc,
                                current_page,
                                selected_image_data["xref"],
                                selected_image_data["bbox"]
                            )
                            if ok:
                                new_bytes = doc.tobytes(garbage=3, deflate=True)
                                st.session_state["edited_pdf_bytes"] = new_bytes
                                save_edited_pdf_to_disk(new_bytes)
                                st.session_state["feedback_msg"] = ("success", dmsg)
                                st.rerun()
                            else:
                                st.error(dmsg)

                    if replace_file is not None:
                        st.markdown("<div class='primary-action-btn'>", unsafe_allow_html=True)
                        if st.button("🔄 Execute Image Replacement", use_container_width=True):
                            # Save upload to temp file
                            suffix = os.path.splitext(replace_file.name)[1]
                            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_img:
                                tmp_img.write(replace_file.getvalue())
                                tmp_img_path = tmp_img.name

                            try:
                                with open(tmp_img_path, "rb") as f:
                                    rep_bytes = f.read()

                                push_undo_state()
                                ok, rmsg = perform_image_replacement(
                                    doc,
                                    current_page,
                                    selected_image_data["xref"],
                                    selected_image_data["bbox"],
                                    rep_bytes,
                                    keep_aspect=keep_aspect
                                )

                                if ok:
                                    new_bytes = doc.tobytes(garbage=3, deflate=True)
                                    st.session_state["edited_pdf_bytes"] = new_bytes
                                    save_edited_pdf_to_disk(new_bytes)
                                    st.session_state["feedback_msg"] = ("success", rmsg)
                                    st.rerun()
                                else:
                                    st.error(rmsg)
                            finally:
                                if os.path.exists(tmp_img_path):
                                    try: os.remove(tmp_img_path)
                                    except Exception: pass
                        st.markdown("</div>", unsafe_allow_html=True)

            # SUBTAB B: ADD NEW IMAGE TO PAGE
            with subtab_add:
                st.markdown(f"##### ➕ Insert New Image onto Page {current_page + 1}")
                new_img_file = st.file_uploader(
                    "Upload Image to Insert",
                    type=["png", "jpg", "jpeg", "webp"],
                    key="add_new_img_uploader"
                )

                if new_img_file is not None:
                    # Compute default natural bounds
                    pil_img = Image.open(new_img_file)
                    nat_w, nat_h = pil_img.size
                    aspect = nat_h / float(nat_w) if nat_w > 0 else 1.0

                    p_w, p_h = p_rect.width, p_rect.height

                    preset_pos = st.selectbox(
                        "Position Preset",
                        options=["Top-Left", "Top-Center", "Top-Right", "Center", "Bottom-Left", "Bottom-Center", "Bottom-Right", "Custom Coordinates"]
                    )

                    col_w, col_h = st.columns(2)
                    with col_w:
                        target_w = st.slider("Target Width (pt)", min_value=50.0, max_value=float(p_w), value=min(200.0, float(p_w * 0.4)), step=5.0)
                    with col_h:
                        calc_h = target_w * aspect
                        target_h = st.number_input("Target Height (pt)", min_value=20.0, max_value=float(p_h), value=float(min(calc_h, p_h * 0.5)), step=5.0)

                    # Position coordinates
                    if preset_pos == "Top-Left":
                        x0, y0 = 40.0, 40.0
                    elif preset_pos == "Top-Center":
                        x0, y0 = (p_w - target_w) / 2.0, 40.0
                    elif preset_pos == "Top-Right":
                        x0, y0 = p_w - target_w - 40.0, 40.0
                    elif preset_pos == "Center":
                        x0, y0 = (p_w - target_w) / 2.0, (p_h - target_h) / 2.0
                    elif preset_pos == "Bottom-Left":
                        x0, y0 = 40.0, p_h - target_h - 40.0
                    elif preset_pos == "Bottom-Center":
                        x0, y0 = (p_w - target_w) / 2.0, p_h - target_h - 40.0
                    elif preset_pos == "Bottom-Right":
                        x0, y0 = p_w - target_w - 40.0, p_h - target_h - 40.0
                    else: # Custom
                        col_cx, col_cy = st.columns(2)
                        with col_cx:
                            x0 = st.number_input("X Coordinate (from left)", min_value=0.0, max_value=float(p_w - target_w), value=50.0)
                        with col_cy:
                            y0 = st.number_input("Y Coordinate (from top)", min_value=0.0, max_value=float(p_h - target_h), value=50.0)

                    insert_rect = fitz.Rect(x0, y0, x0 + target_w, y0 + target_h)
                    st.caption(f"Insertion Target: Rect({x0:.1f}, {y0:.1f}, {x0+target_w:.1f}, {y0+target_h:.1f})")

                    st.markdown("<div class='primary-action-btn'>", unsafe_allow_html=True)
                    if st.button("➕ Insert Image to Page", use_container_width=True):
                        suffix = os.path.splitext(new_img_file.name)[1]
                        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_new_img:
                            tmp_new_img.write(new_img_file.getvalue())
                            tmp_new_path = tmp_new_img.name

                        try:
                            with open(tmp_new_path, "rb") as f:
                                ins_bytes = f.read()

                            push_undo_state()
                            ok, imsg = perform_add_new_image(doc, current_page, ins_bytes, insert_rect, keep_aspect=True)
                            if ok:
                                new_bytes = doc.tobytes(garbage=3, deflate=True)
                                st.session_state["edited_pdf_bytes"] = new_bytes
                                save_edited_pdf_to_disk(new_bytes)
                                st.session_state["feedback_msg"] = ("success", imsg)
                                st.rerun()
                            else:
                                st.error(imsg)
                        finally:
                            if os.path.exists(tmp_new_path):
                                try: os.remove(tmp_new_path)
                                except Exception: pass
                        st.markdown("</div>", unsafe_allow_html=True)

        # ----------------------------------------------------------------------
        # TAB 3: EXTRACTED TEXT INSPECTOR
        # ----------------------------------------------------------------------
        with tab_inspect:
            st.markdown(f"##### 📋 Page {current_page + 1} Extracted Text")
            raw_text, blocks = get_page_extracted_text(doc, current_page)

            col_st1, col_st2 = st.columns(2)
            with col_st1:
                st.caption(f"Total Words: {len(raw_text.split())}")
            with col_st2:
                st.caption(f"Text Spans: {len(blocks)}")

            if raw_text.strip():
                st.markdown(f'<div class="extracted-text-box">{raw_text}</div>', unsafe_allow_html=True)
            else:
                st.info("No text detected on this page (page may contain scanned rasters or images only).")

            with st.expander("🔍 Detailed Text Span Table", expanded=False):
                if blocks:
                    st.dataframe(
                        [{"Text": b["text"], "Font": b["font"], "Size (pt)": b["size"], "BBox": [round(x, 1) for x in b["bbox"]]} for b in blocks],
                        use_container_width=True
                    )
                else:
                    st.caption("No structured spans found.")

    doc.close()

if __name__ == "__main__":
    main()

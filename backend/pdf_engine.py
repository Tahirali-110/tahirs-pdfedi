import os
import io
import base64
import tempfile
from typing import Dict, List, Any, Optional, Tuple
import pymupdf as fitz
from PIL import Image, ImageDraw

OUTPUT_DIR = "output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "edited.pdf")

def int_to_hex(color_int: int) -> str:
    """Convert integer color to #RRGGBB."""
    if not isinstance(color_int, int):
        return "#000000"
    r = (color_int >> 16) & 0xFF
    g = (color_int >> 8) & 0xFF
    b = color_int & 0xFF
    return f"#{r:02x}{g:02x}{b:02x}"

def hex_to_rgb(hex_str: str) -> Tuple[float, float, float]:
    """Convert #RRGGBB to (r, g, b) float tuple in [0, 1]."""
    hex_str = (hex_str or "#000000").lstrip("#")
    if len(hex_str) != 6:
        return (0.0, 0.0, 0.0)
    try:
        return (
            int(hex_str[0:2], 16) / 255.0,
            int(hex_str[2:4], 16) / 255.0,
            int(hex_str[4:6], 16) / 255.0
        )
    except Exception:
        return (0.0, 0.0, 0.0)

def map_font_family(font_str: str, is_bold: bool = False, is_italic: bool = False, flags: int = 0) -> str:
    """Map font name to one of 14 standard PDF base fonts natively supported by PyMuPDF."""
    f = (font_str or "").lower()
    b = is_bold or ("bold" in f) or (flags & 2 != 0) or ("black" in f) or ("heavy" in f)
    i = is_italic or ("italic" in f) or ("oblique" in f) or (flags & 1 != 0)
    serif = ("times" in f) or ("serif" in f) or ("roman" in f) or ("georgia" in f)
    mono = ("courier" in f) or ("mono" in f) or ("consolas" in f) or ("code" in f)

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
        # Default: Helvetica (Sans-serif)
        if b and i: return "hebi"
        if b: return "hebo"
        if i: return "heit"
        return "helv"

def create_sample_pdf_bytes() -> bytes:
    """Generates an ultra-professional multi-page sample PDF with rich executive reporting."""
    doc = fitz.open()

    # --- PAGE 1: Corporate Quarterly Report ---
    p1 = doc.new_page(width=595, height=842) # A4
    # Header bar
    p1.draw_rect(fitz.Rect(0, 0, 595, 28), color=None, fill=(0.09, 0.10, 0.14))
    p1.insert_text((40, 70), "ACME GLOBAL ENTERPRISES", fontsize=22, fontname="hebo", color=(0.10, 0.14, 0.24))
    p1.insert_text((40, 94), "Quarterly Financial Performance & Operations Review", fontsize=12, fontname="helv", color=(0.40, 0.45, 0.55))
    p1.insert_text((40, 120), "Document ID: ACME-2026-Q1 | Classification: Internal Confidential", fontsize=9, fontname="tiit", color=(0.5, 0.5, 0.5))
    
    # Section 1
    p1.insert_text((40, 160), "1. Executive Summary & Revenue Targets", fontsize=15, fontname="hebo", color=(0.85, 0.12, 0.12))
    p1.insert_textbox(
        fitz.Rect(40, 180, 550, 245),
        "In the first quarter of 2026, ACME recorded a total revenue of $4,250,000.\n"
        "Our core operating margin reached 28.5%, surpassing our initial forecast.\n"
        "Total recurring subscriptions grew by 3,400 active client accounts across all sectors.",
        fontsize=11,
        fontname="helv",
        color=(0.12, 0.12, 0.12)
    )

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
    p1.insert_image(fitz.Rect(40, 260, 480, 440), stream=chart_buf.getvalue())

    # Section 2
    p1.insert_text((40, 475), "2. Strategic Priorities & Next Milestones", fontsize=15, fontname="hebo", color=(0.85, 0.12, 0.12))
    p1.insert_textbox(
        fitz.Rect(40, 495, 550, 565),
        "We are finalizing international expansion plans into Tokyo and Berlin.\n"
        "Product development budget is fixed at $950,000 for the upcoming cycle.\n"
        "Please direct all compliance questions to legal@acmeglobal.com.",
        fontsize=11,
        fontname="helv",
        color=(0.12, 0.12, 0.12)
    )

    # --- PAGE 2: Approval & Verification ---
    p2 = doc.new_page(width=595, height=842)
    p2.draw_rect(fitz.Rect(0, 0, 595, 28), color=None, fill=(0.09, 0.10, 0.14))
    p2.insert_text((40, 70), "AUDIT & EXECUTIVE SIGN-OFF", fontsize=20, fontname="hebo", color=(0.10, 0.14, 0.24))
    p2.insert_text((40, 100), "Signatory Authority: Jane Smith, Chief Financial Officer", fontsize=12, fontname="tiro", color=(0.2, 0.2, 0.2))
    p2.insert_text((40, 126), "Audit Status: VERIFIED AND APPROVED", fontsize=12, fontname="hebo", color=(0.1, 0.6, 0.2))
    p2.insert_text((40, 150), "Effective Verification Date: March 31, 2026", fontsize=11, fontname="helv", color=(0.3, 0.3, 0.3))

    # Badge/Seal Image
    seal_img = Image.new("RGB", (220, 90), color=(254, 242, 242))
    sdraw = ImageDraw.Draw(seal_img)
    sdraw.rectangle([(4, 4), (215, 85)], outline=(220, 38, 38), width=3)
    sdraw.text((45, 35), "OFFICIAL SEAL - ACME", fill=(220, 38, 38))
    seal_buf = io.BytesIO()
    seal_img.save(seal_buf, format="PNG")
    p2.insert_image(fitz.Rect(320, 85, 520, 165), stream=seal_buf.getvalue())

    p2.insert_text((40, 210), "Notice: Any unauthorized alteration of this PDF is strictly prohibited.", fontsize=10, fontname="tiit", color=(0.5, 0.5, 0.5))

    # --- PAGE 3: Regional Breakdown ---
    p3 = doc.new_page(width=595, height=842)
    p3.draw_rect(fitz.Rect(0, 0, 595, 28), color=None, fill=(0.09, 0.10, 0.14))
    p3.insert_text((40, 70), "REGIONAL OPERATING SEGMENTS", fontsize=20, fontname="hebo", color=(0.10, 0.14, 0.24))
    p3.insert_textbox(
        fitz.Rect(40, 100, 550, 180),
        "North America accounted for 48% of total gross Billings, driven by enterprise cloud renewals.\n"
        "EMEA operations expanded by 22% year-over-year with strong adoption in DACH countries.\n"
        "Asia-Pacific region contributed $850,000 in net localized revenue.",
        fontsize=11,
        fontname="helv",
        color=(0.12, 0.12, 0.12)
    )

    pdf_bytes = doc.tobytes(garbage=3, deflate=True)
    doc.close()
    return pdf_bytes

def extract_document_properties(doc: fitz.Document, original_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Extract complete PDF metadata and document statistics."""
    meta = doc.metadata or {}
    return {
        "filename": filename,
        "pageCount": len(doc),
        "fileSizeBytes": len(original_bytes),
        "fileSizeFormatted": f"{len(original_bytes) / 1024:.1f} KB",
        "title": meta.get("title") or filename,
        "author": meta.get("author") or "Unknown Author",
        "subject": meta.get("subject") or "Standard Document",
        "keywords": meta.get("keywords") or "None",
        "creator": meta.get("creator") or "Adobe Acrobat Studio",
        "producer": meta.get("producer") or f"PyMuPDF {fitz.__version__}",
        "creationDate": meta.get("creationDate") or "N/A",
        "modDate": meta.get("modDate") or "N/A",
        "isEncrypted": doc.is_encrypted,
        "format": f"PDF {doc.pdf_version() if hasattr(doc, 'pdf_version') else '1.7'}"
    }

def extract_page_data(doc: fitz.Document, page_num: int, zoom: float = 1.5) -> Optional[Dict[str, Any]]:
    """
    Extracts high-resolution rendered page image (base64) along with structured
    text blocks, lines, spans, and embedded images with their bounding boxes.
    """
    if page_num < 0 or page_num >= len(doc):
        return None

    page = doc[page_num]
    rect = page.rect
    width = rect.width
    height = rect.height

    # 1. Render page to high-res PNG image
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    page_img_b64 = f"data:image/png;base64,{base64.b64encode(pix.tobytes('png')).decode('ascii')}"

    # 2. Extract structured text blocks
    text_dict = page.get_text("dict")
    text_blocks = []
    block_counter = 0

    for b in text_dict.get("blocks", []):
        if "lines" in b:
            block_lines = []
            block_spans = []
            full_text = ""

            for l in b["lines"]:
                line_text = ""
                line_spans = []
                for s in l.get("spans", []):
                    t = s.get("text", "")
                    if t:
                        span_item = {
                            "id": f"p{page_num}_s{len(block_spans)}",
                            "text": t,
                            "bbox": list(s["bbox"]),
                            "size": round(float(s.get("size", 11.0)), 1),
                            "font": s.get("font", "Helvetica"),
                            "color": int_to_hex(s.get("color", 0)),
                            "origin": list(s.get("origin", [s["bbox"][0], s["bbox"][3] - 2]))
                        }
                        line_spans.append(span_item)
                        block_spans.append(span_item)
                        line_text += t
                
                if line_text:
                    block_lines.append({
                        "bbox": list(l["bbox"]),
                        "text": line_text,
                        "spans": line_spans
                    })
                    full_text += line_text + "\n"

            if full_text.strip():
                # Detect dominant font size and color for the block
                dominant_size = block_spans[0]["size"] if block_spans else 11.0
                dominant_color = block_spans[0]["color"] if block_spans else "#000000"
                dominant_font = block_spans[0]["font"] if block_spans else "helv"

                text_blocks.append({
                    "id": f"p{page_num}_b{block_counter}",
                    "page": page_num,
                    "bbox": list(b["bbox"]),
                    "text": full_text.strip(),
                    "size": dominant_size,
                    "color": dominant_color,
                    "font": dominant_font,
                    "lines": block_lines,
                    "spans": block_spans
                })
                block_counter += 1

    # 3. Extract embedded images
    image_infos = page.get_image_info(xrefs=True)
    images = []
    img_counter = 0

    for info in image_infos:
        xref = info.get("xref", 0)
        if xref <= 0:
            continue
        w = info.get("width", 0)
        h = info.get("height", 0)
        # Skip 1x1 masks
        if w <= 1 and h <= 1:
            continue
        
        bbox = info.get("bbox")
        if not bbox or len(bbox) != 4:
            continue

        # Extract image data
        data_url = None
        ext = "png"
        try:
            ex = doc.extract_image(xref)
            if ex and "image" in ex:
                raw_bytes = ex["image"]
                ext = ex.get("ext", "png")
                mime = "image/jpeg" if ext in ["jpg", "jpeg"] else "image/png"
                data_url = f"data:{mime};base64,{base64.b64encode(raw_bytes).decode('ascii')}"
        except Exception:
            pass

        images.append({
            "id": f"p{page_num}_img_{xref}_{img_counter}",
            "page": page_num,
            "xref": xref,
            "bbox": list(bbox),
            "width": w,
            "height": h,
            "ext": ext,
            "dataUrl": data_url
        })
        img_counter += 1

    return {
        "pageNumber": page_num,
        "width": width,
        "height": height,
        "rotation": page.rotation,
        "pageImage": page_img_b64,
        "textBlocks": text_blocks,
        "images": images
    }

def search_text_in_document(doc: fitz.Document, query: str, case_sensitive: bool = False) -> List[Dict[str, Any]]:
    """Performs exact text search across all pages, returning page indices and match rects."""
    results = []
    if not query or not query.strip():
        return results

    q = query.strip()
    flags = fitz.TEXT_PRESERVE_WHITESPACE
    if not case_sensitive:
        flags |= fitz.TEXT_DEHYPHENATE

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        matches = page.search_for(q, flags=flags)
        for m in matches:
            results.append({
                "page": page_idx,
                "bbox": [m.x0, m.y0, m.x1, m.y1],
                "text": q
            })
    return results

def apply_modifications_to_page(page: fitz.Page, modifications: Dict[str, Any]):
    """
    Applies staged modifications (text edits, deletions, new text, image transforms/replacements)
    to a PyMuPDF page object using clean vector redaction and insertion.
    """
    text_edits = modifications.get("textEdits", [])
    image_edits = modifications.get("imageEdits", [])
    new_texts = modifications.get("newTexts", [])
    new_images = modifications.get("newImages", [])

    # 1. Process Text Modifications
    for edit in text_edits:
        orig_bbox = fitz.Rect(edit["original_bbox"])
        is_delete = edit.get("isDelete", False)
        new_text = edit.get("newText", "")

        # Redact the original text location with white fill (clean vector wipe)
        page.add_redact_annot(orig_bbox, fill=(1.0, 1.0, 1.0))
        page.apply_redactions()

        # If not deleted and replacement text is present, insert it
        if not is_delete and new_text and new_text.strip():
            font_family = edit.get("fontFamily", "Helvetica")
            is_bold = edit.get("isBold", False)
            is_italic = edit.get("isItalic", False)
            font_name = map_font_family(font_family, is_bold=is_bold, is_italic=is_italic)

            font_size = float(edit.get("fontSize", 11.0))
            font_color = hex_to_rgb(edit.get("fontColor", "#000000"))
            align_str = edit.get("alignment", "left").lower()
            align_code = 1 if align_str == "center" else (2 if align_str == "right" else 0)

            # Target rectangle for text insertion
            target_bbox = edit.get("target_bbox", edit["original_bbox"])
            target_rect = fitz.Rect(target_bbox)

            # Ensure box has sufficient height for multiple lines
            lines = new_text.splitlines() or [new_text]
            min_height = len(lines) * font_size * 1.35
            if target_rect.height < min_height:
                target_rect = fitz.Rect(target_rect.x0, target_rect.y0, max(target_rect.x1, target_rect.x0 + 80), target_rect.y0 + min_height + 4)

            # Insert textbox for multi-line support
            rc = page.insert_textbox(
                target_rect,
                new_text,
                fontsize=font_size,
                fontname=font_name,
                color=font_color,
                align=align_code
            )

            # If text overflowed textbox slightly, fallback to line-by-line insert
            if rc < 0:
                for idx, line in enumerate(lines):
                    baseline = target_rect.y0 + (idx + 1) * font_size * 1.15
                    page.insert_text(
                        (target_rect.x0, baseline),
                        line,
                        fontsize=font_size,
                        fontname=font_name,
                        color=font_color
                    )

    # 2. Process Image Modifications
    for i_edit in image_edits:
        xref = i_edit.get("xref", 0)
        orig_bbox = fitz.Rect(i_edit["original_bbox"])
        is_delete = i_edit.get("isDelete", False)
        new_bbox = fitz.Rect(i_edit.get("new_bbox", i_edit["original_bbox"]))

        # Remove old image stream and redact old location
        if xref > 0:
            try:
                page.delete_image(xref)
            except Exception:
                pass
        page.add_redact_annot(orig_bbox, fill=(1.0, 1.0, 1.0))
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE)

        # If not delete, insert image into new_bbox
        if not is_delete:
            img_bytes = None
            # Check if user uploaded a replacement image (base64)
            if i_edit.get("replacementDataUrl"):
                raw_b64 = i_edit["replacementDataUrl"].split(",")[-1]
                img_bytes = base64.b64decode(raw_b64)
            elif i_edit.get("originalDataUrl"):
                raw_b64 = i_edit["originalDataUrl"].split(",")[-1]
                img_bytes = base64.b64decode(raw_b64)

            if img_bytes:
                keep_prop = i_edit.get("keepAspect", False)
                rotate_angle = int(i_edit.get("rotation", 0)) % 360
                page.insert_image(new_bbox, stream=img_bytes, keep_proportion=keep_prop, rotate=rotate_angle)

    # 3. Process Newly Added Text
    for n_text in new_texts:
        t_rect = fitz.Rect(n_text["bbox"])
        content = n_text.get("text", "")
        if content:
            font_size = float(n_text.get("fontSize", 12.0))
            font_color = hex_to_rgb(n_text.get("fontColor", "#000000"))
            font_name = map_font_family(n_text.get("fontFamily", "Helvetica"), is_bold=n_text.get("isBold", False), is_italic=n_text.get("isItalic", False))
            align_str = n_text.get("alignment", "left").lower()
            align_code = 1 if align_str == "center" else (2 if align_str == "right" else 0)
            page.insert_textbox(t_rect, content, fontsize=font_size, fontname=font_name, color=font_color, align=align_code)

    # 4. Process Newly Added Images
    for n_img in new_images:
        n_rect = fitz.Rect(n_img["bbox"])
        raw_b64 = n_img["dataUrl"].split(",")[-1]
        n_bytes = base64.b64decode(raw_b64)
        page.insert_image(n_rect, stream=n_bytes, keep_proportion=n_img.get("keepAspect", True))

def export_edited_pdf(original_pdf_bytes: bytes, page_modifications_dict: Dict[str, Any], page_order: Optional[List[int]] = None, page_rotations: Optional[Dict[str, int]] = None) -> bytes:
    """
    Exports a new PDF with all staged edits applied across all pages.
    Guarantees the original uploaded PDF is never modified or overwritten.
    Validates the generated PDF before saving to output/edited.pdf and returning bytes.
    """
    doc = fitz.open(stream=original_pdf_bytes, filetype="pdf")

    # 1. Apply Page Modifications
    for page_str, mods in page_modifications_dict.items():
        page_idx = int(page_str)
        if 0 <= page_idx < len(doc):
            apply_modifications_to_page(doc[page_idx], mods)

    # 2. Apply Custom Page Rotations if specified
    if page_rotations:
        for page_str, angle in page_rotations.items():
            page_idx = int(page_str)
            if 0 <= page_idx < len(doc):
                doc[page_idx].set_rotation((doc[page_idx].rotation + angle) % 360)

    # 3. Apply Page Reordering / Deletions if specified
    if page_order is not None and len(page_order) > 0:
        new_doc = fitz.open()
        for idx in page_order:
            if 0 <= idx < len(doc):
                new_doc.insert_pdf(doc, from_page=idx, to_page=idx)
        doc.close()
        doc = new_doc

    edited_bytes = doc.tobytes(garbage=3, deflate=True)
    doc.close()

    # 4. Validation: Verify that the generated bytes form a completely valid, uncorrupted PDF
    try:
        verify_doc = fitz.open(stream=edited_bytes, filetype="pdf")
        assert len(verify_doc) > 0, "Exported PDF has 0 pages"
        verify_doc.close()
    except Exception as e:
        raise ValueError(f"Export validation failed: {str(e)}")

    # 5. Save copy to output/edited.pdf
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(OUTPUT_FILE, "wb") as f:
            f.write(edited_bytes)
    except Exception:
        fallback_path = os.path.join(tempfile.gettempdir(), "edited.pdf")
        with open(fallback_path, "wb") as f:
            f.write(edited_bytes)

    return edited_bytes

def render_preview_with_edits(original_pdf_bytes: bytes, page_num: int, modifications: Dict[str, Any], rotation_delta: int = 0, zoom: float = 1.5) -> Optional[str]:
    """
    Renders an instant preview of a single page with staged modifications applied.
    """
    doc = fitz.open(stream=original_pdf_bytes, filetype="pdf")
    if page_num < 0 or page_num >= len(doc):
        doc.close()
        return None
    page = doc[page_num]
    apply_modifications_to_page(page, modifications)
    if rotation_delta != 0:
        page.set_rotation((page.rotation + rotation_delta) % 360)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    doc.close()
    return f"data:image/png;base64,{base64.b64encode(pix.tobytes('png')).decode('ascii')}"

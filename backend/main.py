import os
import io
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
import pymupdf as fitz

from pdf_engine import (
    create_sample_pdf_bytes,
    extract_page_data,
    extract_document_properties,
    search_text_in_document,
    export_edited_pdf,
    render_preview_with_edits,
    OUTPUT_FILE
)

app = FastAPI(title="Tahir's PDFedi — Enterprise PDF Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DocumentSession:
    def __init__(self):
        self.original_bytes: Optional[bytes] = None
        self.filename: str = "document.pdf"
        self.doc: Optional[fitz.Document] = None

    def load_bytes(self, pdf_bytes: bytes, filename: str):
        self.original_bytes = pdf_bytes
        self.filename = filename
        if self.doc:
            try: self.doc.close()
            except Exception: pass
        self.doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    def get_page_count(self) -> int:
        return len(self.doc) if self.doc else 0

session = DocumentSession()

# Pre-load sample document so the editor is immediately operational on startup
sample_bytes = create_sample_pdf_bytes()
session.load_bytes(sample_bytes, "sample_corporate_report.pdf")

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "engine": "PyMuPDF-Enterprise",
        "version": fitz.__version__,
        "activePages": session.get_page_count(),
        "filename": session.filename
    }

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a new PDF to edit. The original file is stored in memory and never overwritten."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    contents = await file.read()
    try:
        session.load_bytes(contents, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF file: {str(e)}")

    page_count = session.get_page_count()
    first_page = extract_page_data(session.doc, 0)
    props = extract_document_properties(session.doc, session.original_bytes, session.filename)

    return {
        "success": True,
        "filename": session.filename,
        "pageCount": page_count,
        "firstPage": first_page,
        "properties": props
    }

@app.post("/api/load-sample")
def load_sample():
    """Load the built-in professional multi-page sample report."""
    s_bytes = create_sample_pdf_bytes()
    session.load_bytes(s_bytes, "sample_corporate_report.pdf")
    page_count = session.get_page_count()
    first_page = extract_page_data(session.doc, 0)
    props = extract_document_properties(session.doc, session.original_bytes, session.filename)

    return {
        "success": True,
        "filename": session.filename,
        "pageCount": page_count,
        "firstPage": first_page,
        "properties": props
    }

@app.get("/api/document-info")
def get_document_info():
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    return {
        "filename": session.filename,
        "pageCount": session.get_page_count()
    }

@app.get("/api/document/properties")
def get_document_properties():
    if not session.doc or not session.original_bytes:
        raise HTTPException(status_code=404, detail="No document loaded.")
    return extract_document_properties(session.doc, session.original_bytes, session.filename)

@app.get("/api/page/{page_num}")
def get_page(page_num: int, zoom: float = 1.5):
    """Retrieve full data for a single page: rendered image, text blocks, spans, and images."""
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    if page_num < 0 or page_num >= session.get_page_count():
        raise HTTPException(status_code=404, detail="Page number out of range.")

    data = extract_page_data(session.doc, page_num, zoom=zoom)
    return data

class SearchRequest(BaseModel):
    query: str
    caseSensitive: Optional[bool] = False

@app.post("/api/search")
def search_text(req: SearchRequest):
    """Search for text across all pages with coordinate matches."""
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    matches = search_text_in_document(session.doc, req.query, req.caseSensitive or False)
    return {
        "query": req.query,
        "totalMatches": len(matches),
        "matches": matches
    }

class RotatePageRequest(BaseModel):
    pageNumber: int
    angle: int = 90 # 90 or -90

@app.post("/api/page/rotate")
def rotate_page(req: RotatePageRequest):
    """Rotate a page by 90 degrees."""
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    if req.pageNumber < 0 or req.pageNumber >= session.get_page_count():
        raise HTTPException(status_code=400, detail="Invalid page number.")

    page = session.doc[req.pageNumber]
    page.set_rotation((page.rotation + req.angle) % 360)
    session.original_bytes = session.doc.tobytes(garbage=3, deflate=True)
    updated_page = extract_page_data(session.doc, req.pageNumber)

    return {
        "success": True,
        "pageNumber": req.pageNumber,
        "rotation": page.rotation,
        "updatedPage": updated_page
    }

class DeletePageRequest(BaseModel):
    pageNumber: int

@app.post("/api/page/delete")
def delete_page(req: DeletePageRequest):
    """Delete a page from the document."""
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    if session.get_page_count() <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only page in the document.")
    if req.pageNumber < 0 or req.pageNumber >= session.get_page_count():
        raise HTTPException(status_code=400, detail="Invalid page number.")

    session.doc.delete_page(req.pageNumber)
    session.original_bytes = session.doc.tobytes(garbage=3, deflate=True)
    new_page_count = session.get_page_count()
    target_page = min(req.pageNumber, new_page_count - 1)
    updated_page = extract_page_data(session.doc, target_page)

    return {
        "success": True,
        "pageCount": new_page_count,
        "activePage": target_page,
        "updatedPage": updated_page
    }

class DuplicatePageRequest(BaseModel):
    pageNumber: int

@app.post("/api/page/duplicate")
def duplicate_page(req: DuplicatePageRequest):
    """Duplicate a page in the document."""
    if not session.doc:
        raise HTTPException(status_code=404, detail="No document loaded.")
    p = req.pageNumber
    if p < 0 or p >= session.get_page_count():
        raise HTTPException(status_code=400, detail="Invalid page number.")

    session.doc.insert_pdf(session.doc, from_page=p, to_page=p, start_at=p + 1)
    session.original_bytes = session.doc.tobytes(garbage=3, deflate=True)
    new_page_count = session.get_page_count()

    return {
        "success": True,
        "pageCount": new_page_count,
        "duplicatedIndex": p + 1
    }

class PreviewRequest(BaseModel):
    pageNumber: int
    modifications: Dict[str, Any]
    rotationDelta: Optional[int] = 0
    zoom: Optional[float] = 1.5

@app.post("/api/preview")
def preview_page_edits(req: PreviewRequest):
    """Render a live preview image of a page with staged modifications applied."""
    if not session.original_bytes:
        raise HTTPException(status_code=404, detail="No document loaded.")

    preview_img = render_preview_with_edits(
        original_pdf_bytes=session.original_bytes,
        page_num=req.pageNumber,
        modifications=req.modifications,
        rotation_delta=req.rotationDelta or 0,
        zoom=req.zoom or 1.5
    )
    if not preview_img:
        raise HTTPException(status_code=500, detail="Failed to render page preview.")

    return {"previewImage": preview_img}

class ExportRequest(BaseModel):
    modifications: Dict[str, Any]
    pageOrder: Optional[List[int]] = None
    pageRotations: Optional[Dict[str, int]] = None

@app.post("/api/export")
def export_pdf(req: ExportRequest):
    """
    Export all modifications into a new PDF.
    Validates output integrity, saves to output/edited.pdf, and provides download URL.
    Original uploaded PDF is strictly untouched.
    """
    if not session.original_bytes:
        raise HTTPException(status_code=404, detail="No document loaded.")

    try:
        edited_bytes = export_edited_pdf(
            original_pdf_bytes=session.original_bytes,
            page_modifications_dict=req.modifications,
            page_order=req.pageOrder,
            page_rotations=req.pageRotations
        )
        return {
            "success": True,
            "message": "PDF exported and verified successfully",
            "fileSize": len(edited_bytes),
            "downloadUrl": "/api/download"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.get("/api/download")
def download_pdf():
    """Download the newly exported edited PDF file."""
    if not os.path.exists(OUTPUT_FILE):
        if session.original_bytes:
            export_edited_pdf(session.original_bytes, {})
        else:
            raise HTTPException(status_code=404, detail="No edited PDF available.")

    return FileResponse(
        OUTPUT_FILE,
        media_type="application/pdf",
        filename="edited.pdf"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

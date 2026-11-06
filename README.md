# Acrobat Studio — Professional In-Place PDF Editor

An ultra-premium, professional-grade PDF editing application inspired by **Adobe Acrobat Pro**, **Figma**, and modern desktop productivity tools.

---

## 🌟 Key Highlights & Architecture

### 1. Direct In-Place Text Editing
- **No separate forms or dropdowns:** Click any text block to inspect it; double-click (or press Enter) to edit in place.
- **Underlying Text Masking:** While editing, an opaque white patch masks the original underlying text so you only see what you type in place.
- **Floating Typography Ribbon:**
  - Font Families: `Helvetica` (Sans-Serif), `Times New Roman` (Serif), `Courier` (Monospace).
  - Font Size: Stepper & number input (in points).
  - Font Color: Native color picker.
  - Styles: Bold (`B`), Italic (`I`), Alignment (Left, Center, Right).
- **True Vector Redaction:** Permanently removes existing text glyphs and PDF vector streams using PyMuPDF before inserting replacement text at the exact baseline coordinates.
- **Delete Text:** Click the red trash icon in the floating ribbon to redact and remove any text block.
- **Add New Text Anywhere:** Switch to `Add Text` mode and click anywhere on the page to position a new text element.

### 2. Direct Image Selection, Transformation & Rotation
- **Interactive 8-Handle Transformer:** Click any embedded image to reveal 8 resize handles (`NW`, `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`).
- **Drag & Reposition:** Move any image across the page canvas.
- **Corner Resizing:** Resize images while maintaining natural aspect ratio by default (or toggle unlocked).
- **Rotation Pin:** Drag the top purple pin to rotate images by any angle ($0^\circ$ to $360^\circ$), or use the quick $90^\circ$ rotate button.
- **Replace Image:** Click *Replace Image* to swap with any `PNG`, `JPG`, or `WEBP` from your computer.
- **Delete Image:** Redact and remove the image from the document.

### 3. Professional Workspace & Document Operations
- **Obsidian Dark Theme & Slate Light Mode:** Deep charcoal backgrounds (`#090a0d`, `#14171f`), subtle blue/violet accents (`#6366f1`, `#8b5cf6`), minimal glassmorphism, and instant light mode switch.
- **Page Operations:**
  - Rotate Page (+90° clockwise).
  - Reorder Pages (Move Up / Move Down).
  - Duplicate Page.
  - Delete Page (with safety confirmation dialog).
- **Document Search (Ctrl+F):** Find exact text across all pages with match highlighting on the canvas and previous/next navigation.
- **Properties Inspector:** Right-side drawer showing element coordinates $(X, Y)$, dimensions $(W, H)$, typography, and document metadata.
- **Staged Modifications & History:** Multi-level Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`), with auto-save to LocalStorage.
- **Safe Non-Destructive Export:** Never modifies or overwrites your original uploaded PDF. Exports a verified PDF to `output/edited.pdf` and initiates an automatic browser download.

---

## 🚀 Quick Start on Windows

### Option 1: Double-Click Scripts (Easiest for Beginners)

Inside your project folder `c:\Users\syedt\OneDrive\Documents\Desktop\PDF-EDITOR`:
1. Double-click **`install.bat`** (first time only — installs backend Python packages and frontend npm packages).
2. Double-click **`run.bat`** (starts backend and frontend, and automatically opens `http://localhost:5173` in your browser).

---

### Option 2: Step-by-Step Terminal Commands

Open **PowerShell** or **Command Prompt**:

```powershell
cd c:\Users\syedt\OneDrive\Documents\Desktop\PDF-EDITOR
```

#### Step 1: Install Dependencies
```powershell
# 1. Install backend requirements
python -m pip install -r backend\requirements.txt

# 2. Install frontend packages
cd frontend
npm install
cd ..
```

#### Step 2: Start the Backend (Terminal 1)
```powershell
cd c:\Users\syedt\OneDrive\Documents\Desktop\PDF-EDITOR\backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs on `http://127.0.0.1:8000`*

#### Step 3: Start the Frontend (Terminal 2)
Open a second terminal window:
```powershell
cd c:\Users\syedt\OneDrive\Documents\Desktop\PDF-EDITOR\frontend
npm run dev
```
*Frontend runs on `http://localhost:5173`*

#### Step 4: Open in Your Browser
```
http://localhost:5173
```

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo last modification |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo modification |
| `Ctrl + F` | Open Document Search bar |
| `Ctrl + Enter` | Commit in-place text edit |
| `Escape` | Deselect element / Close modals / Cancel edit |
| `+` / `-` | Zoom in / Zoom out |
| `?` | Open Help & Shortcuts guide |

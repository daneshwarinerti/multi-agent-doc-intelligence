"""
file_parser.py
--------------
File parsing module for the Extractor.
Parses PDF, DOCX, and TXT files into structured page lists:
[{"page_num": 1, "text": "..."}, {"page_num": 2, "text": "..."}]

Handled deterministically without LLM calls for speed, accuracy, and cost efficiency.
"""

import os
import pypdf
import docx

def parse_pdf(file_path: str) -> list[dict]:
    """
    Extracts text page by page from a PDF file using pypdf.
    Returns a list of dictionaries with page numbers (1-indexed) and extracted text.
    """
    pages = []
    reader = pypdf.PdfReader(file_path)
    
    if len(reader.pages) == 0:
        raise ValueError(f"The PDF file '{os.path.basename(file_path)}' contains no pages.")

    total_text_length = 0
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        total_text_length += len(text.strip())
        pages.append({
            "page_num": idx + 1,
            "text": text
        })

    # Error handling for scanned / image-only PDFs with no extractable text
    if total_text_length == 0:
        raise ValueError(
            f"The PDF file '{os.path.basename(file_path)}' contains no extractable text. "
            "It may be a scanned image-only PDF, which requires OCR."
        )

    return pages

def parse_docx(file_path: str) -> list[dict]:
    """
    Extracts text from a DOCX file using python-docx.
    Group paragraphs into logical pages (roughly ~3000 chars per page).
    """
    doc = docx.Document(file_path)
    full_text = []
    
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
            
    if not full_text:
        raise ValueError(f"The DOCX file '{os.path.basename(file_path)}' is empty.")

    combined_text = "\n\n".join(full_text)
    
    # Split DOCX into synthetic pages of ~3000 chars if long, else 1 page
    page_size = 3000
    pages = []
    start = 0
    page_num = 1
    
    while start < len(combined_text):
        end = start + page_size
        pages.append({
            "page_num": page_num,
            "text": combined_text[start:end]
        })
        start = end
        page_num += 1

    return pages

def parse_txt(file_path: str) -> list[dict]:
    """
    Extracts text from a plain TXT file.
    Splits text into synthetic pages of ~3000 characters.
    """
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    if not content.strip():
        raise ValueError(f"The text file '{os.path.basename(file_path)}' is empty.")

    page_size = 3000
    pages = []
    start = 0
    page_num = 1

    while start < len(content):
        end = start + page_size
        pages.append({
            "page_num": page_num,
            "text": content[start:end]
        })
        start = end
        page_num += 1

    return pages

def parse_file(file_path: str) -> list[dict]:
    """
    Main parser entry point. Automatically routes to the correct parser based on file extension.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: '{file_path}'")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".docx":
        return parse_docx(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Only PDF, DOCX, and TXT are supported.")

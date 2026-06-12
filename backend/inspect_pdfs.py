import os
import pypdf

pdf_dir = r"c:\Users\User\Downloads\Traditional_RAG"
for name in sorted(os.listdir(pdf_dir)):
    if name.endswith(".pdf"):
        path = os.path.join(pdf_dir, name)
        print("="*60)
        print(f"FILE: {name}")
        print("="*60)
        reader = pypdf.PdfReader(path)
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            print(f"--- Page {idx+1} ---")
            print(text.strip())
        print("\n")

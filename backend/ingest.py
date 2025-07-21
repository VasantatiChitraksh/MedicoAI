import os
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings

DATA_PATH = 'data/'
DB_FAISS_PATH = 'vectorstore/db_faiss'

def create_vector_db():
    """Loads PDFs, splits them into chunks, and creates a FAISS vector store."""
    # Load all PDF files from the data path
    db.save_local(DB_FAISS_PATH)
    print(f"Vector store created successfully at {DB_FAISS_PATH}")

if __name__ == "__main__":
    create_vector_db()
import os
import uvicorn
import whisper
import tempfile
import shutil
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import GoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains.retrieval_qa.base import RetrievalQA
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv

# Load environment variables (for GOOGLE_API_KEY)
load_dotenv()

# --- Initialize Models and Services ---
print("Loading models and services...")
# Whisper Model for STT
whisper_model = whisper.load_model("tiny")

# Embeddings and Vector Store for RAG
embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2',
                                   model_kwargs={'device': 'cpu'})
db = FAISS.load_local("vectorstore/db_faiss", embeddings,
                      allow_dangerous_deserialization=True)

# Gemini LLM for Generation
llm = GoogleGenerativeAI(model="gemini-2.0-flash",
                         google_api_key=os.getenv("GOOGLE_API_KEY"))

# RAG Prompt Template
prompt_template = """
Use the following pieces of information to answer the user's question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context: {context}
Question: {question}

Answer the question based on the context provided.
"""
prompt = PromptTemplate(template=prompt_template,
                        input_variables=['context', 'question'])

# RAG Chain
chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=db.as_retriever(search_kwargs={'k': 2}),
    return_source_documents=True,
    chain_type_kwargs={'prompt': prompt}
)
print("Models and services loaded successfully.")


# --- FastAPI App ---
app = FastAPI()

# CORS Middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "MedicoAI Backend is running!"}


@app.post("/api/query")
async def query_rag(query: str = Form(...)):
    """Receives a text query and returns the RAG model's answer."""
    try:
        result = chain.invoke({"query": query})
        return {"answer": result["result"]}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Receives an MP3 audio file, saves it temporarily, transcribes it using
    Whisper, and then deletes the temporary file.
    """
    tmp_path = ""
    try:
        # Create a temporary file to securely save the upload.
        # Using a `with` statement ensures it's properly handled.
        # `delete=False` is important so we can get its path to pass to Whisper.
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            # Use shutil.copyfileobj for a memory-efficient way to save the file
            shutil.copyfileobj(audio_file.file, tmp)
            tmp_path = tmp.name

        # Now that the file is saved, pass its path to the Whisper model.
        # Note: Add `fp16=False` if you are running Whisper on a CPU.
        print(f"Transcribing audio file: {tmp_path}")
        result = whisper_model.transcribe(tmp_path)
        print("Transcription complete.")
        
        return {"transcription": result["text"]}

    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}

    finally:
        # This `finally` block ensures the temporary file is *always* cleaned up,
        # even if an error occurs during transcription.
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        
        # Ensure the uploaded file stream from the request is closed.
        await audio_file.close()

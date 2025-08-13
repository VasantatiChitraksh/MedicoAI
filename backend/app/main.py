import os
import time
import uvicorn
import whisper
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

UPLOAD_DIRECTORY = "audio_uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)
# --- Initialize Models and Services ---
print("Loading models and services...")
# Whisper Model for STT
whisper_model = whisper.load_model("base")

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
    allow_origins=["http://localhost:5173"],
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
    # Create a unique filename using a timestamp to avoid overwrites
    unique_filename = f"{int(time.time())}_{audio_file.filename}"
    file_location = os.path.join(UPLOAD_DIRECTORY, unique_filename)

    try:
        # Save the uploaded file to the permanent directory
        with open(file_location, "wb") as f:
            shutil.copyfileobj(audio_file.file, f)
        
        print(f"Audio permanently saved at: {file_location}")

        # --- Transcription (No change here) ---
        result = whisper_model.transcribe(file_location, fp16=False)
        transcription = result["text"]
        
        print(f"Transcription: {transcription}")
        return {"transcription": transcription}

    except Exception as e:
        print(f"An error occurred: {e}")
    
    # NOTE: We no longer have a 'finally' block to delete the file
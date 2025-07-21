import os
import whisper
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import GoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains.retrieval_qa.base import RetrievalQA
from langchain.vectorstores import FAISS
from langchain.embeddings import HuggingFaceEmbeddings
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
llm = GoogleGenerativeAI(
    model="gemini-pro", google_api_key=os.getenv("GOOGLE_API_KEY"))

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
        result = chain({"query": query})
        return {"answer": result["result"]}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Receives an audio file and returns the transcribed text."""
    try:
        # Save the uploaded file temporarily
        with open(audio_file.filename, "wb") as buffer:
            buffer.write(audio_file.file.read())

        # Transcribe the audio file
        result = whisper_model.transcribe(audio_file.filename)
        os.remove(audio_file.filename)  # Clean up the temp file

        return {"transcription": result["text"]}
    except Exception as e:
        return {"error": str(e)}

# To run the app: uvicorn main:app --reload

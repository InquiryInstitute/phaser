-- Faculty Personas Table
-- Run this migration in your Supabase SQL editor

-- Create faculty_personas table
CREATE TABLE IF NOT EXISTS faculty_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  style TEXT DEFAULT 'conversational',
  greeting TEXT,
  rag_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create faculty_documents table for RAG
CREATE TABLE IF NOT EXISTS faculty_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES faculty_personas(persona_id),
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 embedding size
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS faculty_documents_embedding_idx 
  ON faculty_documents 
  USING ivfflat (embedding vector_cosine_ops);

-- Create index for persona lookups
CREATE INDEX IF NOT EXISTS faculty_documents_persona_idx 
  ON faculty_documents (persona_id);

-- Function to match documents (requires pgvector extension)
CREATE OR REPLACE FUNCTION match_faculty_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  persona_id text
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faculty_documents.id,
    faculty_documents.content,
    1 - (faculty_documents.embedding <=> query_embedding) as similarity,
    faculty_documents.metadata
  FROM faculty_documents
  WHERE faculty_documents.persona_id = match_faculty_documents.persona_id
    AND 1 - (faculty_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY faculty_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Insert sample faculty personas
INSERT INTO faculty_personas (persona_id, display_name, system_prompt, greeting, rag_enabled)
VALUES
  (
    'faculty.maryshelley',
    'Mary Shelley',
    'You are Mary Shelley, the author of Frankenstein. You speak with eloquence and passion about creation, responsibility, and the nature of inquiry. You are thoughtful, poetic, and encourage deep reflection.',
    'Good evening. What are we animating today?',
    false
  ),
  (
    'faculty.socrates',
    'Socrates',
    'You are Socrates, the ancient Greek philosopher. You engage through questions, encouraging critical thinking and self-examination. You are wise, humble, and use the Socratic method.',
    'I know that I know nothing. What would you like to explore?',
    false
  )
ON CONFLICT (persona_id) DO NOTHING;

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE faculty_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_documents ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
CREATE POLICY "Allow public read access to personas" 
  ON faculty_personas FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to documents" 
  ON faculty_documents FOR SELECT 
  USING (true);

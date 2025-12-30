from supabase import create_client, Client
import os

# -----------------------------
# Supabase Credentials (YOUR REAL PROJECT)
# -----------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://vycppulekjhojmzpiabi.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y3BwdWxla2pob2ptenBpYWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMDAyNzAsImV4cCI6MjA3NzY3NjI3MH0.-GsT8VLghLBHWtjwI_9cgvUYiCJNoqgxOuO8EfyJoZ4")

# -----------------------------
# Initialize Supabase client
# -----------------------------
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

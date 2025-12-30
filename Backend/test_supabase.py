from supabase_client import supabase

# Lấy danh sách bảng có trong database
tables = supabase.table("profiles").select("*").limit(1).execute()
print("✅ Kết nối thành công! Dữ liệu mẫu:")
print(tables)

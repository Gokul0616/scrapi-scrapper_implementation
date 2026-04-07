import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variable from .env file
load_dotenv()

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'scrapi')

if not mongo_url:
    print("❌ MONGO_URL not found in .env")
    exit(1)

client = MongoClient(mongo_url)
db = client[db_name]

print(f"📡 Connected to MongoDB: {db_name}")
print("-" * 30)

collections = [
    "kv_stores", "kv_store_items", 
    "request_queues", "rq_items", 
    "datasets", "dataset_items",
    "fs.files", "fs.chunks"
]

for coll in collections:
    count = db[coll].count_documents({})
    print(f"📦 {coll:15}: {count} documents")

print("-" * 30)

# Check for our test user
test_user_id = "test-user-123"
print(f"🔍 Checking for test user '{test_user_id}':")
kv_count = db["kv_stores"].count_documents({"user_id": test_user_id})
rq_count = db["request_queues"].count_documents({"user_id": test_user_id})
print(f" - KV Stores: {kv_count}")
print(f" - Request Queues: {rq_count}")

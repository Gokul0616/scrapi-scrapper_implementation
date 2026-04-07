import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ.get('MONGO_URL')
client = MongoClient(mongo_url)

print("🔍 Searching across ALL databases for Phase 2 data...")
dbs = client.list_database_names()

found_any = False
for db_name in dbs:
    db = client[db_name]
    colls = db.list_collection_names()
    
    # Storage layer collections
    target_colls = ["kv_stores", "kv_store_items", "request_queues", "rq_items", "datasets", "dataset_items"]
    
    matches = [c for c in target_colls if c in colls]
    if matches:
        print(f"\n📁 Database: {db_name}")
        for c in matches:
            count = db[c].count_documents({})
            if count > 0:
                found_any = True
                print(f"  - {c:15}: {count} documents")
                # Show one sample record id
                sample = db[c].find_one()
                print(f"    (Sample ID: {sample.get('id', sample.get('_id'))})")

if not found_any:
    print("\n❌ No Phase 2 data found in ANY database.")
    print("This suggests the data might have been written to a different cluster or handled in-memory.")

import os
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
import io
import json
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime, timezone

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

logger = logging.getLogger(__name__)

class KeyValueStore:
    """Hybrid Service handling Blob Storage either natively via AWS S3 or Local Filesystem Fallback."""
    
    def __init__(self, store_id: str, db=None, workspace_id: Optional[str] = None):
        self.store_id = store_id
        self.db = db
        self.workspace_id = workspace_id
        
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        self.s3_bucket = os.getenv("AWS_S3_BUCKET")
        
        # If all S3 configs are present, use S3, else fallback locally
        self.use_s3 = bool(HAS_BOTO3 and self.aws_access_key and self.aws_secret_key and self.s3_bucket)
        
        if self.use_s3:
            self.s3_client = boto3.client(
                's3',
                region_name=self.aws_region,
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key
            )
        else:
            # Fallback path via MongoDB GridFS for large distributed blobs
            self.fs = AsyncIOMotorGridFSBucket(self.db) if self.db else None

    async def _track_billing(self, operation: str, bytes_count: int = 0):
        """Records granular metrics into MongoDB for Apify-style Billing aggregation."""
        if not self.db or not self.workspace_id: return
        
        await self.db.storage_metrics.insert_one({
            "workspace_id": self.workspace_id,
            "store_id": self.store_id,
            "type": "key_value",
            "operation": operation, # "read", "write", "list"
            "bytes": bytes_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        await self.db.key_value_stores.update_one(
            {"id": self.store_id},
            {"$inc": {
                f"metrics.{operation}s": 1,
                "metrics.total_bytes": bytes_count if operation == "write" else 0
            }}
        )

    async def set_record(self, key: str, value: Union[str, bytes], content_type: str = "text/plain") -> Dict[str, Any]:
        """Puts a specific key into the store."""
        
        # Convert dict to JSON string implicitly
        if isinstance(value, dict):
            value = json.dumps(value)
            content_type = "application/json"
            
        bytes_data = value.encode('utf-8') if isinstance(value, str) else value
        byte_size = len(bytes_data)

        if self.use_s3:
            s3_key = f"{self.store_id}/{key}"
            try:
                # Boto3 is synchronous natively, wrapping it cleanly
                # In serious scale we'd use aioboto3, but this fits the MVP
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=s3_key,
                    Body=bytes_data,
                    ContentType=content_type
                )
            except ClientError as e:
                logger.error(f"S3 Put Error: {e}")
                raise Exception("Failed to save to cloud storage.")
        else:
            if self.fs:
                # Remove if exists to simulate PUT
                cursor = self.fs.find({"filename": f"{self.store_id}/{key}"})
                async for doc in cursor:
                    await self.fs.delete(doc._id)
                
                await self.fs.upload_from_stream(
                    f"{self.store_id}/{key}", 
                    io.BytesIO(bytes_data),
                    metadata={"content_type": content_type}
                )

        await self._track_billing("write", byte_size)
        return {"key": key, "size_bytes": byte_size}

    async def get_record(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific key from the store."""
        if self.use_s3:
            s3_key = f"{self.store_id}/{key}"
            try:
                response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=s3_key)
                body = response['Body'].read()
                content_type = response.get('ContentType', 'application/octet-stream')
                await self._track_billing("read", len(body))
                return {"key": key, "content_type": content_type, "body": body}
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchKey':
                    return None
                raise
        else:
            if self.fs:
                cursor = self.fs.find({"filename": f"{self.store_id}/{key}"})
                async for doc in cursor:
                    grid_out = await self.fs.open_download_stream(doc._id)
                    body = await grid_out.read()
                    content_type = doc.metadata.get("content_type", "application/octet-stream") if doc.metadata else "application/octet-stream"
                    await self._track_billing("read", len(body))
                    return {"key": key, "content_type": content_type, "body": body}
            return None

    async def list_keys(self) -> list[str]:
        """Lists all keys currently placed inside the generic blob container."""
        keys = []
        if self.use_s3:
            s3_key_prefix = f"{self.store_id}/"
            try:
                paginator = self.s3_client.get_paginator('list_objects_v2')
                pages = paginator.paginate(Bucket=self.s3_bucket, Prefix=s3_key_prefix)
                for page in pages:
                    if 'Contents' in page:
                        for obj in page['Contents']:
                            keys.append(obj['Key'][len(s3_key_prefix):])
            except ClientError as e:
                logger.error(f"S3 List Error: {e}")
        else:
            if self.fs:
                cursor = self.fs.find({"filename": {"$regex": f"^{self.store_id}/"}})
                async for doc in cursor:
                    keys.append(doc.filename[len(self.store_id)+1:])
                        
        await self._track_billing("list", 0)
        return keys

    async def delete_record(self, key: str) -> bool:
        """Deletes a specific key from the store."""
        if self.use_s3:
            s3_key = f"{self.store_id}/{key}"
            try:
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
                await self._track_billing("write", 0) # Deletes map as Write ops via standard billing
                return True
            except ClientError:
                return False
        else:
            if self.fs:
                cursor = self.fs.find({"filename": f"{self.store_id}/{key}"})
                deleted = False
                async for doc in cursor:
                    await self.fs.delete(doc._id)
                    deleted = True
                
                if deleted:
                    await self._track_billing("write", 0)
                return deleted
            return False

    async def clear_store(self):
        """Purges entire KeyValueStore recursively."""
        if self.use_s3:
            s3_key_prefix = f"{self.store_id}/"
            objects = self.s3_client.list_objects_v2(Bucket=self.s3_bucket, Prefix=s3_key_prefix)
            if 'Contents' in objects:
                for obj in objects['Contents']:
                    self.s3_client.delete_object(Bucket=self.s3_bucket, Key=obj['Key'])
        else:
            if self.fs:
                cursor = self.fs.find({"filename": {"$regex": f"^{self.store_id}/"}})
                async for doc in cursor:
                    await self.fs.delete(doc._id)

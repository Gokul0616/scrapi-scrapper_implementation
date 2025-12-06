from datetime import datetime, timezone
from models import AuditLog
import logging

logger = logging.getLogger(__name__)

async def log_admin_action(
    db,
    admin_user: dict,
    action: str,
    target_type: str,
    target_id: str = None,
    target_name: str = None,
    details: str = None,
    metadata: dict = None,
    ip_address: str = None
):
    """
    Log an administrative action to the database.
    """
    try:
        log_entry = AuditLog(
            admin_id=admin_user['id'],
            admin_username=admin_user['username'],
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=details,
            metadata=metadata or {},
            ip_address=ip_address
        )
        
        doc = log_entry.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.audit_logs.insert_one(doc)
        logger.info(f"Audit Log: {admin_user['username']} {action} {target_type} {target_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}")
        return False

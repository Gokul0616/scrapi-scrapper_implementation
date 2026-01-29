
# Global instances
db = None
fs = None
proxy_manager = None
task_manager = None

def set_globals(database, proxy_mgr=None, task_mgr=None):
    """Set the global instances."""
    global db, proxy_manager, task_manager
    db = database
    if proxy_mgr:
        proxy_manager = proxy_mgr
    if task_mgr:
        task_manager = task_mgr

def get_db():
    return db

def get_proxy_manager():
    return proxy_manager

def get_task_manager():
    return task_manager

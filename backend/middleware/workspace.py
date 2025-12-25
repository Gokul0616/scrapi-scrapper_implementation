from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

logger = logging.getLogger(__name__)

class WorkspaceMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle workspace context.
    Extracts workspace information from headers and adds it to request state.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Extract workspace context from headers
        workspace_type = request.headers.get('X-Workspace-Type', 'personal')
        workspace_id = request.headers.get('X-Workspace-Id', '')
        
        # Add workspace context to request state
        request.state.workspace_type = workspace_type
        request.state.workspace_id = workspace_id
        
        logger.debug(f"Workspace context: type={workspace_type}, id={workspace_id}")
        
        response = await call_next(request)
        return response


def get_workspace_context(request: Request) -> dict:
    """
    Helper function to get workspace context from request.
    Returns dict with workspace_type and workspace_id.
    """
    return {
        'workspace_type': getattr(request.state, 'workspace_type', 'personal'),
        'workspace_id': getattr(request.state, 'workspace_id', '')
    }

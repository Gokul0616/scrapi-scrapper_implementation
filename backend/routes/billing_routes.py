from fastapi import APIRouter, Depends, HTTPException, Request
from auth.auth import get_current_user
from middleware.workspace import get_workspace_context
from services.billing_service import billing_service
from pydantic import BaseModel

router = APIRouter(prefix="/api/billing", tags=["billing"])

class CheckoutRequest(BaseModel):
    plan_type: str

@router.get("/summary")
async def get_summary(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        summary = await billing_service.get_billing_summary(workspace['workspace_id'], workspace['workspace_type'])
        return summary
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/checkout")
async def create_checkout(
    req: CheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        
        # Only owners can manage billing for organizations
        if workspace['workspace_type'] == 'organization' and workspace.get('role') != 'owner':
            raise HTTPException(status_code=403, detail="Only organization owners can manage billing and subscriptions.")
            
        url = await billing_service.create_checkout_session(workspace['workspace_id'], workspace['workspace_type'], req.plan_type)
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

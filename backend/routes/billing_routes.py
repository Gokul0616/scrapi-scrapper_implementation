from fastapi import APIRouter, Depends, HTTPException, Request
from auth.auth import get_current_user
from middleware.workspace import get_workspace_context
from services.billing_service import billing_service
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/billing", tags=["billing"])

# Database reference — set by main app
db = None

def set_billing_db(database):
    global db
    db = database

class CheckoutRequest(BaseModel):
    plan_type: str

class PayPalCreateRequest(BaseModel):
    amount: float

class PayPalCaptureRequest(BaseModel):
    order_id: str
    workspace_id: str
    workspace_type: str
    plan_data: dict
    billing_details: Optional[dict] = None

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

@router.get("/plans")
async def get_plans_data(
    current_user: dict = Depends(get_current_user)
):
    try:
        return await billing_service.get_plans_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/historical")
async def get_historical(
    month: int,
    year: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        historical_data = await billing_service.get_historical_usage(
            workspace['workspace_id'], 
            workspace['workspace_type'],
            month,
            year
        )
        return historical_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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


# ── Billing details (for checkout form) ───────────────────────────────────────
class BillingDetailsModel(BaseModel):
    full_name: Optional[str] = None
    company: Optional[str] = None
    tax_id: Optional[str] = None
    registration_no: Optional[str] = None     # Company registration number
    billing_contact: Optional[str] = None     # Billing contact person
    street_address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    billing_email: Optional[str] = None
    custom_address_text: Optional[str] = None
    custom_goods_text: Optional[str] = None
    workspace_id: Optional[str] = None
    workspace_type: Optional[str] = None


@router.get("/details")
async def get_billing_details(
    workspace_id: Optional[str] = None,
    workspace_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get saved billing details for the current user + workspace."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    query = {"user_id": user_id}
    if workspace_id:   query["workspace_id"]   = workspace_id
    if workspace_type: query["workspace_type"] = workspace_type
    doc = await db.billing_details.find_one(query, {"_id": 0, "user_id": 0})
    return doc or {}


@router.post("/details")
async def save_billing_details(
    data: BillingDetailsModel,
    current_user: dict = Depends(get_current_user)
):
    """Save billing details for the current user + workspace (upsert)."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    payload = data.model_dump(exclude_none=True)
    payload["user_id"]    = user_id
    payload["updated_at"] = datetime.now(timezone.utc)
    # Upsert per user + workspace so personal and org details are stored separately
    match_filter = {"user_id": user_id}
    if data.workspace_id:   match_filter["workspace_id"]   = data.workspace_id
    if data.workspace_type: match_filter["workspace_type"] = data.workspace_type
    await db.billing_details.update_one(match_filter, {"$set": payload}, upsert=True)
    return {"message": "Billing details saved"}


# ── Subscription / confirmed checkout snapshot ────────────────────────────────
class SubscriptionSetupModel(BaseModel):
    plan: Optional[str] = None
    is_annual: Optional[bool] = None
    payment_method: Optional[str] = None          # "card" | "paypal"
    card_last4: Optional[str] = None
    card_expiry: Optional[str] = None
    billing_full_name: Optional[str] = None
    billing_company: Optional[str] = None
    billing_street_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None
    workspace_id: Optional[str] = None
    workspace_type: Optional[str] = None          # "personal" | "organization"


@router.get("/subscription")
async def get_subscription_setup(
    workspace_id: Optional[str] = None,
    workspace_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Return the last confirmed subscription setup for the current user + workspace."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    query = {"user_id": user_id}
    if workspace_id:   query["workspace_id"]   = workspace_id
    if workspace_type: query["workspace_type"] = workspace_type
    doc = await db.billing_subscriptions.find_one(query, {"_id": 0, "user_id": 0})
    return doc or {}


@router.post("/subscription")
async def save_subscription_setup(
    data: SubscriptionSetupModel,
    current_user: dict = Depends(get_current_user)
):
    """Save (mock) confirmed subscription setup for the current user + workspace."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    payload = data.model_dump(exclude_none=True)
    payload["user_id"]      = user_id
    payload["confirmed_at"] = datetime.now(timezone.utc)
    # Upsert per user + workspace so personal and org setups are stored separately
    match_filter = {"user_id": user_id}
    if data.workspace_id:   match_filter["workspace_id"]   = data.workspace_id
    if data.workspace_type: match_filter["workspace_type"] = data.workspace_type
    await db.billing_subscriptions.update_one(
        match_filter,
        {"$set": payload},
        upsert=True
    )
    return {"message": "Subscription setup saved"}

# ── PayPal Integration ───────────────────────────────────────────────────────

@router.post("/paypal/create-order")
async def paypal_create_order(
    req: PayPalCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        order = await billing_service.create_paypal_order(req.amount)
        return order
    except Exception as e:
        print(f"PayPal Create Order Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create PayPal order")

@router.post("/paypal/capture-order")
async def paypal_capture_order(
    req: PayPalCaptureRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user.get("id")
        result = await billing_service.capture_paypal_order(
            req.order_id,
            user_id,
            req.workspace_id,
            req.workspace_type,
            req.plan_data,
            req.billing_details
        )
        return result
    except Exception as e:
        import traceback
        error_tb = traceback.format_exc()
        print(f"PayPal Capture Order Error: {str(e)}\n{error_tb}")
        raise HTTPException(status_code=500, detail=f"Failed to capture PayPal order: {str(e)}")

@router.get("/invoices")
async def get_invoices(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        invoices = await billing_service.get_invoices(workspace['workspace_id'], workspace['workspace_type'])
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        invoice = await billing_service.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    from fastapi.responses import Response
    try:
        invoice = await billing_service.get_invoice_by_id(invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
            
        pdf_content = await billing_service.generate_invoice_pdf(invoice)
        filename = f"invoice_{invoice.get('invoice_no', invoice_id)}.pdf"
        
        return Response(
            content=bytes(pdf_content),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

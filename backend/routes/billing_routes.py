from fastapi import APIRouter, Depends, HTTPException, Request
import requests
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

class UpgradeConfirmRequest(BaseModel):
    workspace_id: str
    workspace_type: str
    plan_data: dict

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

@router.get("/proration")
async def get_proration(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        discount = await billing_service.get_proration_discount(workspace['workspace_id'], workspace['workspace_type'])
        summary = await billing_service.get_billing_summary(workspace['workspace_id'], workspace['workspace_type'])
        account_balance = summary.get("account_balance", 0.0)
        return {"discount": discount, "account_balance": account_balance}
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
    state: Optional[str] = None
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
    workspace_id: Optional[str] = None,
    workspace_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save billing details for the current user + workspace (upsert)."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    payload = data.model_dump(exclude_none=True)
    payload["user_id"]    = user_id
    payload["updated_at"] = datetime.now(timezone.utc)
    
    # Priority: Query Param > Body > None
    wid = workspace_id or data.workspace_id
    wtype = workspace_type or data.workspace_type
    
    # Upsert per user + workspace so personal and org details are stored separately
    match_filter = {"user_id": user_id}
    if wid:   
        match_filter["workspace_id"] = wid
        payload["workspace_id"] = wid
    if wtype: 
        match_filter["workspace_type"] = wtype
        payload["workspace_type"] = wtype
        
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
    billing_state: Optional[str] = None
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
    workspace_id: Optional[str] = None,
    workspace_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Save (mock) confirmed subscription setup for the current user + workspace."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    user_id = current_user.get("id")
    payload = data.model_dump(exclude_none=True)
    payload["user_id"]      = user_id
    payload["confirmed_at"] = datetime.now(timezone.utc)
    
    # Priority: Query Param > Body > None
    wid = workspace_id or data.workspace_id
    wtype = workspace_type or data.workspace_type
    
    # Upsert per user + workspace so personal and org setups are stored separately
    match_filter = {"user_id": user_id}
    if wid:   
        match_filter["workspace_id"]   = wid
        payload["workspace_id"] = wid
    if wtype: 
        match_filter["workspace_type"] = wtype
        payload["workspace_type"] = wtype
        
    await db.billing_subscriptions.update_one(
        match_filter,
        {"$set": payload},
        upsert=True
    )
    return {"message": "Subscription setup saved"}

@router.delete("/payment-method")
async def delete_payment_method(
    workspace_id: Optional[str] = None,
    workspace_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Deletes the payment method and card details from the current subscription setup."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
    
    user_id = current_user.get("id")
    match_filter = {"user_id": user_id}
    if workspace_id:   match_filter["workspace_id"]   = workspace_id
    if workspace_type: match_filter["workspace_type"] = workspace_type
    
    await db.billing_subscriptions.update_one(
        match_filter,
        {"$unset": {"payment_method": "", "card_last4": "", "card_expiry": "", "paypal_order_id": ""}}
    )
    return {"message": "Payment method deleted successfully"}

@router.get("/page-details")
async def get_page_details(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Unified endpoint to fetch summary, billing details, and subscription setup in one call."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
        
    try:
        workspace = get_workspace_context(request)
        workspace_id = workspace['workspace_id']
        workspace_type = workspace['workspace_type']
        
        # Fetch summary (which hits db.runs, db.users/orgs, etc)
        summary = await billing_service.get_billing_summary(workspace_id, workspace_type)
        
        # Fetch billing details (manual address)
        user_id = current_user.get("id")
        docs_query = {"user_id": user_id, "workspace_id": workspace_id, "workspace_type": workspace_type}
        
        details_doc = await db.billing_details.find_one(docs_query, {"_id": 0, "user_id": 0})
        # fallback to personal user details if workspace specific doesn't exist
        if not details_doc and workspace_type != "personal":
             details_doc = await db.billing_details.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
             
        # Fetch subscription setup (payment methods, plan active, etc)
        sub_doc = await db.billing_subscriptions.find_one(docs_query, {"_id": 0, "user_id": 0})
        if not sub_doc and workspace_type != "personal":
             sub_doc = await db.billing_subscriptions.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
             
        return {
            "summary": summary,
            "billing_details": details_doc or {},
            "subscription": sub_doc or {}
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class PromoValidateRequest(BaseModel):
    code: str

@router.post("/promo/validate")
async def validate_promo_code(
    req: PromoValidateRequest,
    current_user: dict = Depends(get_current_user)
):
    from datetime import datetime, timezone
    """Validates user-submitted promo code, updates click analytics, and returns attached offers."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialised")
        
    code = req.code.strip().upper()
    
    # Track the 'click' attempt directly 
    await db.affiliate_links.update_one(
        {"code": code},
        {"$inc": {"clicks": 1}}
    )
    
    link = await db.affiliate_links.find_one({"code": code}, {"_id": 0})
    if not link:
        # Fallback: check if 'code' matches a username (case-insensitive)
        # We use the raw input for username matching to be more natural
        raw_code = req.code.strip()
        user_match = await db.users.find_one({"username": {"$regex": f"^{raw_code}$", "$options": "i"}})
        if user_match:
            # Return a standardized referral object for user-to-user referrals
            return {
                "code": user_match['username'],
                "type": "referral",
                "commission_rate": 0.20,  # Standard 20% commission for user referrals
                "attached_offers": [
                    {"type": "addon", "id": "platform_credits", "qty": 5.0} # $5 free credit
                ],
                "is_active": True,
                "owner_user_id": user_match.get("id")
            }
        raise HTTPException(status_code=404, detail="Invalid promo code")
        
    # Check expiry
    expiry = link.get("expiry_date")
    if expiry:
        try:
            if datetime.now(timezone.utc) > datetime.fromisoformat(expiry):
                raise HTTPException(status_code=400, detail="Promo code has expired")
        except ValueError:
            pass # Ignore malformed dates
            
    return {
        "valid": True,
        "code": link.get("code"),
        "commission_rate": link.get("commission_rate"),
        "attached_offers": link.get("attached_offers", []),
        "applicable_plans": link.get("applicable_plans", []),
        "expiry_date": link.get("expiry_date")
    }

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

@router.post("/upgrade/confirm")
async def upgrade_confirm(
    req: UpgradeConfirmRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user.get("id")
        result = await billing_service.apply_zero_dollar_upgrade(
            user_id,
            req.workspace_id,
            req.workspace_type,
            req.plan_data
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        error_tb = traceback.format_exc()
        print(f"Upgrade Confirm Error: {str(e)}\n{error_tb}")
        raise HTTPException(status_code=500, detail=f"Failed to confirm upgrade: {str(e)}")

@router.get("/invoices")
async def get_invoices(
    request: Request,
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        workspace = get_workspace_context(request)
        result = await billing_service.get_invoices(
            workspace['workspace_id'], 
            workspace['workspace_type'], 
            page, 
            limit,
            search
        )
        return result
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

@router.get("/pincode-lookup")
async def pincode_lookup(
    country_code: str,
    pincode: str,
    current_user: dict = Depends(get_current_user)
):
    """Multi-provider proxy for pincode lookup with universal fallback."""
    try:
        # 1. Try Zippopotam (Good for Global)
        zip_url = f"https://api.zippopotam.us/{country_code}/{pincode}"
        try:
            r = requests.get(zip_url, timeout=3)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass

        # 2. Level 2: Provider-specific fallbacks
        if country_code.upper() == 'IN':
            # PostOffice IN is dedicated for India
            india_url = f"https://api.postalpincode.in/pincode/{pincode}"
            try:
                r = requests.get(india_url, timeout=3)
                if r.status_code == 200:
                    data = r.json()
                    if data and data[0]['Status'] == 'Success':
                        po = data[0]['PostOffice'][0]
                        return {
                            "post code": pincode,
                            "country": "India",
                            "country abbreviation": "IN",
                            "places": [{
                                "place name": po['Name'],
                                "longitude": "",
                                "state": po['State'],
                                "state abbreviation": "",
                                "latitude": ""
                            }]
                        }
            except Exception:
                pass

        # 3. Universal Fallback: Nominatim (OpenStreetMap)
        # Covers almost everything global if other sources fail
        osm_url = f"https://nominatim.openstreetmap.org/search"
        params = {
            "postalcode": pincode,
            "country": country_code,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": 1
        }
        headers = {
            "User-Agent": "Scrapi-App-Billing-Lookup/1.0 (contact@scrapi.custom)"
        }
        try:
            r = requests.get(osm_url, params=params, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json()
                if data:
                    addr = data[0].get('address', {})
                    # Try to find a sensible 'place name'
                    city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('suburb') or addr.get('municipality')
                    return {
                        "post code": pincode,
                        "country": addr.get('country') or "",
                        "country abbreviation": addr.get('country_code', '').upper(),
                        "places": [{
                            "place name": city or addr.get('county') or "",
                            "longitude": data[0].get('lon', ''),
                            "state": addr.get('state') or "",
                            "state abbreviation": addr.get('ISO3166-2-lvl4', '').split('-')[-1] if 'ISO3166-2-lvl4' in addr else "",
                            "latitude": data[0].get('lat', '')
                        }]
                    }
        except Exception:
            pass
            
        # 4. Final Fallback for missing Zip Codes (often missing from OSM/Zippopotam globally)
        try:
            # Open-Meteo Geocoding API is free for non-commercial use, very reliable global data
            om_url = f"https://geocoding-api.open-meteo.com/v1/search?name={pincode}&count=1&format=json"
            r = requests.get(om_url, timeout=3)
            if r.status_code == 200:
                data = r.json()
                results = data.get('results', [])
                if results:
                    # Optional: Verify it loosely matches the country code if provided, but trusting the zip is often fine
                    res_country_code = results[0].get('country_code', '')
                    if not country_code or res_country_code.upper() == country_code.upper():
                        return {
                            "post code": pincode,
                            "country": results[0].get('country', country_code),
                            "country abbreviation": res_country_code,
                            "places": [{
                                "place name": results[0].get('name', ''),
                                "longitude": str(results[0].get('longitude', '')),
                                "state": results[0].get('admin1', ''),
                                "state abbreviation": "", # Open-Meteo gives full state name usually
                                "latitude": str(results[0].get('latitude', ''))
                            }]
                        }
        except Exception:
            pass

        # 5. Ultimate Fallback for US Zip Codes (PO Boxes like 37001 that no free API has)
        if country_code.upper() == 'US' and pincode.isdigit() and len(pincode) == 5:
            prefix = int(pincode[:3])
            state_map = {
                (0, 3):   ("Puerto Rico", "PR"), (10, 27): ("Massachusetts", "MA"), (28, 29): ("Rhode Island", "RI"), 
                (30, 38): ("New Hampshire", "NH"), (39, 49): ("Maine", "ME"), (50, 59): ("Vermont", "VT"),
                (60, 69): ("Connecticut", "CT"), (70, 89): ("New Jersey", "NJ"), (100, 149): ("New York", "NY"),
                (150, 196): ("Pennsylvania", "PA"), (197, 199): ("Delaware", "DE"), (200, 205): ("District of Columbia", "DC"),
                (206, 219): ("Maryland", "MD"), (220, 246): ("Virginia", "VA"), (247, 269): ("West Virginia", "WV"),
                (270, 289): ("North Carolina", "NC"), (290, 299): ("South Carolina", "SC"), (300, 319): ("Georgia", "GA"),
                (320, 349): ("Florida", "FL"), (350, 369): ("Alabama", "AL"), (370, 385): ("Tennessee", "TN"),
                (386, 397): ("Mississippi", "MS"), (400, 427): ("Kentucky", "KY"), (430, 458): ("Ohio", "OH"),
                (460, 479): ("Indiana", "IN"), (480, 499): ("Michigan", "MI"), (500, 528): ("Iowa", "IA"),
                (530, 549): ("Wisconsin", "WI"), (550, 567): ("Minnesota", "MN"), (570, 577): ("South Dakota", "SD"),
                (580, 588): ("North Dakota", "ND"), (590, 599): ("Montana", "MT"), (600, 629): ("Illinois", "IL"),
                (630, 658): ("Missouri", "MO"), (660, 679): ("Kansas", "KS"), (680, 693): ("Nebraska", "NE"),
                (700, 714): ("Louisiana", "LA"), (716, 729): ("Arkansas", "AR"), (730, 749): ("Oklahoma", "OK"),
                (750, 799): ("Texas", "TX"), (800, 816): ("Colorado", "CO"), (820, 831): ("Wyoming", "WY"),
                (832, 838): ("Idaho", "ID"), (840, 847): ("Utah", "UT"), (850, 865): ("Arizona", "AZ"),
                (870, 884): ("New Mexico", "NM"), (889, 898): ("Nevada", "NV"), (900, 961): ("California", "CA"),
                (967, 968): ("Hawaii", "HI"), (970, 979): ("Oregon", "OR"), (980, 994): ("Washington", "WA"),
                (995, 999): ("Alaska", "AK")
            }
            for (low, high), (state_name, state_abbr) in state_map.items():
                if low <= prefix <= high:
                    return {
                        "post code": pincode,
                        "country": "United States",
                        "country abbreviation": "US",
                        "places": [{
                            "place name": "", # City unknown purely from prefix
                            "longitude": "",
                            "state": state_name,
                            "state abbreviation": state_abbr,
                            "latitude": ""
                        }]
                    }

        return {"places": []}
    except Exception as e:
        return {"error": str(e), "places": []}

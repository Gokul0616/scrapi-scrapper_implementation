"""Service to seed initial policy documents to the database."""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


async def seed_initial_policies(db) -> None:
    """Seed initial policy documents if they don't exist."""
    logger.info("🔍 Checking for existing policies...")
    
    # Check if policies already exist
    existing_count = await db.policies.count_documents({})
    if existing_count > 0:
        logger.info(f"✅ Policies already seeded ({existing_count} documents found)")
        return
    
    logger.info("📝 Seeding initial policy documents...")
    
    policies = [
        {
            "doc_id": "cookie-policy",
            "title": "Cookie Policy",
            "last_updated": "August 15, 2025",
            "intro": "This Cookie Policy describes how Scrapi Technologies Pvt. Ltd. ('we', 'us', or 'our') uses cookies on our Website and Platform, in compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.",
            "sidebar_items": [
                {"id": "cookies", "title": "What are Cookies?", "icon": "🍪"},
                {"id": "types", "title": "Types of Cookies", "icon": "📋"},
                {"id": "consent", "title": "Consent & Control", "icon": "✓"},
                {"id": "duration", "title": "Cookie Duration", "icon": "⏱️"}
            ],
            "sections": [
                {
                    "id": "cookies",
                    "title": "What are Cookies?",
                    "content": "Cookies are small text files stored on your device when you access our Website or Platform. They help us function effectively and improve your experience. We use them in accordance with Indian data privacy regulations.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "types",
                    "title": "Types of Cookies We Use",
                    "content": "We use different types of cookies for various purposes:",
                    "subsections": [
                        {
                            "id": "strictly-necessary",
                            "title": "Strictly Necessary Cookies",
                            "content": "Essential for the website's operation (e.g., login, security). These cannot be disabled."
                        },
                        {
                            "id": "performance",
                            "title": "Performance & Analytics Cookies",
                            "content": "Help us understand how you use our site to improve performance. We use aggregated data where possible."
                        },
                        {
                            "id": "functional",
                            "title": "Functional Cookies",
                            "content": "Enable enhanced functionality and personalization (e.g., language preference)."
                        },
                        {
                            "id": "targeting",
                            "title": "Targeting/Advertising Cookies",
                            "content": "Used to deliver relevant advertisements. We request explicit consent for these as per DPDP Act, 2023."
                        }
                    ],
                    "table": []
                },
                {
                    "id": "consent",
                    "title": "Consent and Control",
                    "content": "By using our website, you consent to the use of necessary cookies. For other types, you have the right to withdraw consent at any time via the Cookie Settings.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "duration",
                    "title": "Cookie Duration",
                    "content": "Cookies have different lifespans. Session cookies expire when you close your browser, while persistent cookies remain for a specified period.",
                    "subsections": [],
                    "table": [
                        {"name": "AWSALB", "description": "AWS Load Balancer for routing", "type": "Strictly necessary", "expiration": "6 days"},
                        {"name": "ScrapiAuth", "description": "User authentication token", "type": "Strictly necessary", "expiration": "Session"},
                        {"name": "CONSENT", "description": "Cookie consent status", "type": "Necessary", "expiration": "1 year"},
                        {"name": "_ga", "description": "Google Analytics user distinction", "type": "Performance", "expiration": "2 years"}
                    ]
                }
            ],
            "is_public": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "terms-of-service",
            "title": "Terms of Service",
            "last_updated": "September 1, 2025",
            "intro": "These Terms of Service ('Terms') govern your access to and use of Scrapi's services. By accessing our platform, you agree to be bound by these Terms, which are governed by the laws of India.",
            "sidebar_items": [
                {"id": "acceptance", "title": "Acceptance of Terms", "icon": "📜"},
                {"id": "account", "title": "User Accounts & KYC", "icon": "👤"},
                {"id": "usage", "title": "Usage Restrictions", "icon": "⚠️"},
                {"id": "jurisdiction", "title": "Jurisdiction", "icon": "⚖️"}
            ],
            "sections": [
                {
                    "id": "acceptance",
                    "title": "Acceptance of Terms",
                    "content": "By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use our Services.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "account",
                    "title": "User Accounts & KYC",
                    "content": "You may need to register an account. You agree to provide accurate information. For certain services, we may require KYC documents as per Indian regulations.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "usage",
                    "title": "Usage Restrictions",
                    "content": "You agree not to misuse the Services. Prohibited acts include violating the Information Technology Act, 2000, scraping prohibited data, or infringing intellectual property rights.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "jurisdiction",
                    "title": "Governing Law and Jurisdiction",
                    "content": "These Terms shall be governed by the laws of India. Any disputes arising out of these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.",
                    "subsections": [],
                    "table": []
                }
            ],
            "is_public": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "privacy-policy",
            "title": "Privacy Policy",
            "last_updated": "August 20, 2025",
            "intro": "We are committed to protecting your privacy in accordance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.",
            "sidebar_items": [
                {"id": "collection", "title": "Data Collection", "icon": "📊"},
                {"id": "rights", "title": "Your Rights", "icon": "✊"},
                {"id": "sharing", "title": "Data Sharing", "icon": "🔒"},
                {"id": "contact", "title": "Contact Us", "icon": "📧"}
            ],
            "sections": [
                {
                    "id": "collection",
                    "title": "Information We Collect",
                    "content": "We collect personal data you provide (Name, Email, Phone) and usage data. We process this data only for the purposes you have consented to or for legitimate uses defined by law.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "rights",
                    "title": "Your Rights under DPDP Act",
                    "content": "As a user, you have several important rights regarding your personal data:",
                    "subsections": [
                        {
                            "id": "access",
                            "title": "Right to Access",
                            "content": "You can request a summary of your personal data being processed."
                        },
                        {
                            "id": "correction",
                            "title": "Right to Correction",
                            "content": "You can request correction or completion of inaccurate data."
                        },
                        {
                            "id": "erasure",
                            "title": "Right to Erasure",
                            "content": "You can request deletion of your data unless retention is required by law."
                        },
                        {
                            "id": "grievance",
                            "title": "Right to Grievance Redressal",
                            "content": "You can contact our Grievance Officer for any privacy concerns."
                        }
                    ],
                    "table": []
                },
                {
                    "id": "sharing",
                    "title": "Data Sharing & Localization",
                    "content": "We do not sell your data. We may share data with service providers under strict contracts. Your data is primarily stored on servers in India or in countries with adequate data protection standards as approved by the Indian Government.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "contact",
                    "title": "Grievance Officer",
                    "content": "For any privacy-related concerns, please contact our Grievance Officer: Mr. Rahul Sharma, Email: grievance@scrapi.com, Address: Scrapi Tech, HSR Layout, Bengaluru - 560102.",
                    "subsections": [],
                    "table": []
                }
            ],
            "is_public": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "acceptable-use-policy",
            "title": "Acceptable Use Policy",
            "last_updated": "July 10, 2025",
            "intro": "This policy sets out the rules for using Scrapi's Services to ensure safety and compliance with Indian laws.",
            "sidebar_items": [
                {"id": "prohibited", "title": "Prohibited Activities", "icon": "🚫"},
                {"id": "enforcement", "title": "Enforcement", "icon": "⚖️"}
            ],
            "sections": [
                {
                    "id": "prohibited",
                    "title": "Prohibited Activities",
                    "content": "You may not use the Services for: (a) Hosting/sharing content prohibited under Section 67 of the IT Act (obscenity, child sexual abuse material); (b) Promoting hate speech, violence, or discrimination; (c) Violating copyright or trademark laws; (d) Sending spam.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "enforcement",
                    "title": "Enforcement",
                    "content": "We reserve the right to suspend or terminate accounts violating this policy and report illegal activities to Indian law enforcement agencies (CERT-In, Cyber Crime Cell).",
                    "subsections": [],
                    "table": []
                }
            ],
            "is_public": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "gdpr",
            "title": "GDPR Compliance",
            "last_updated": "May 25, 2025",
            "intro": "While we are an Indian company, we respect the privacy of our global users and comply with the GDPR for our EU users.",
            "sidebar_items": [
                {"id": "rights", "title": "Your Rights", "icon": "✊"},
                {"id": "transfer", "title": "Data Transfers", "icon": "🌍"}
            ],
            "sections": [
                {
                    "id": "rights",
                    "title": "Your Rights",
                    "content": "EU users have rights to access, rectification, erasure, restriction of processing, and data portability.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "transfer",
                    "title": "Data Transfers",
                    "content": "Transfers of data from the EEA to India are protected by Standard Contractual Clauses (SCCs).",
                    "subsections": [],
                    "table": []
                }
            ],
            "is_public": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "ccpa",
            "title": "CCPA Notice",
            "last_updated": "January 1, 2025",
            "intro": "Notice for California residents regarding their privacy rights.",
            "sidebar_items": [
                {"id": "rights", "title": "California Rights", "icon": "✊"},
                {"id": "sales", "title": "No Sale Policy", "icon": "🚫"}
            ],
            "sections": [
                {
                    "id": "rights",
                    "title": "Your California Privacy Rights",
                    "content": "Right to know, delete, and opt-out of sale of personal information.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "sales",
                    "title": "No Sale of Personal Information",
                    "content": "Scrapi does not sell personal information.",
                    "subsections": [],
                    "table": []
                }
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "security",
            "title": "Security Measures",
            "last_updated": "August 1, 2025",
            "intro": "We implement reasonable security practices and procedures as required by the IT Act, 2000 and ISO 27001 standards.",
            "sidebar_items": [
                {"id": "infrastructure", "title": "Infrastructure", "icon": "🏗️"},
                {"id": "data", "title": "Data Encryption", "icon": "🔐"},
                {"id": "incident", "title": "Incident Reporting", "icon": "🚨"}
            ],
            "sections": [
                {
                    "id": "infrastructure",
                    "title": "Infrastructure Security",
                    "content": "Hosted on secure cloud infrastructure with firewalls, IDS/IPS, and regular audits.",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "data",
                    "title": "Data Encryption",
                    "content": "Data is encrypted in transit (TLS 1.2+) and at rest (AES-256).",
                    "subsections": [],
                    "table": []
                },
                {
                    "id": "incident",
                    "title": "Incident Reporting",
                    "content": "We have a mechanism to report cybersecurity incidents to CERT-In within the mandated timelines.",
                    "subsections": [],
                    "table": []
                }
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        },
        {
            "doc_id": "subprocessors",
            "title": "List of Subprocessors",
            "last_updated": "June 15, 2025",
            "intro": "We use the following third-party service providers:",
            "sidebar_items": [
                {"id": "list", "title": "Current Subprocessors", "icon": "📋"}
            ],
            "sections": [
                {
                    "id": "list",
                    "title": "Current Subprocessors",
                    "content": "Entities processing data on our behalf:",
                    "subsections": [],
                    "table": [
                        {"name": "Amazon Web Services", "description": "Cloud Hosting", "type": "Infrastructure", "location": "Mumbai, India (Primary)"},
                        {"name": "MongoDB Atlas", "description": "Database", "type": "Database", "location": "Mumbai, India"},
                        {"name": "Razorpay/Stripe", "description": "Payment Gateway", "type": "Payments", "location": "India/USA"},
                        {"name": "SendGrid", "description": "Email Service", "type": "Communication", "location": "USA"},
                        {"name": "Google Analytics", "description": "Analytics", "type": "Analytics", "location": "Global"}
                    ]
                }
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "created_by": "system",
            "updated_by": "system"
        }
    ]
    
    # Insert all policies
    result = await db.policies.insert_many(policies)
    logger.info(f"✅ Successfully seeded {len(result.inserted_ids)} policy documents")

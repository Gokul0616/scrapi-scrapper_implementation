#!/usr/bin/env python3
"""
Test script to verify email service functionality
"""
import asyncio
import sys
sys.path.insert(0, '/app/backend')

from services.email_service import get_email_service

async def test_deletion_email():
    """Test sending account deletion email"""
    print("🧪 Testing Account Deletion Email Service...")
    print("-" * 50)
    
    email_service = get_email_service()
    
    # Test parameters
    test_email = "test@example.com"
    test_username = "testuser"
    
    print(f"📧 Sending test email to: {test_email}")
    print(f"👤 Username: {test_username}")
    print("-" * 50)
    
    try:
        result = await email_service.send_account_deletion_email(
            to_email=test_email,
            username=test_username
        )
        
        if result:
            print("✅ Email sent successfully!")
            print("\nEmail Details:")
            print(f"  • Subject: Your SCRAPI Account Has Been Deleted")
            print(f"  • To: {test_email}")
            print(f"  • From: {email_service.smtp_email}")
            print(f"  • Content: HTML + Plain Text")
            print("\nEmail includes:")
            print("  ✓ Personalized greeting")
            print("  ✓ List of deleted items")
            print("  ✓ Farewell message")
            print("  ✓ Security notice")
            print("  ✓ Support contact information")
        else:
            print("❌ Email sending failed (returned False)")
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        print(f"\nPossible causes:")
        print("  • SMTP credentials not configured")
        print("  • Network connectivity issues")
        print("  • Invalid recipient email")
        return False
    
    return True

if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("SCRAPI - Email Service Test")
    print("=" * 50 + "\n")
    
    result = asyncio.run(test_deletion_email())
    
    print("\n" + "=" * 50)
    if result:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed - check error messages above")
    print("=" * 50 + "\n")
    
    sys.exit(0 if result else 1)

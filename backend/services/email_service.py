import smtplib
import os
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_email = os.getenv('SMTP_EMAIL')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        
    def generate_otp(self, length=6):
        """Generate a random OTP code."""
        return ''.join(random.choices(string.digits, k=length))
    
    async def send_otp_email(self, to_email: str, otp: str, purpose: str = "login"):
        """Send OTP email via SMTP."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] OTP for {to_email}: {otp} (Purpose: {purpose})")
            return True

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Your SCRAPI Verification Code - {otp}"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            # Create HTML content
            purpose_text = "sign in to" if purpose == "login" else "complete your registration with"
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #1f2937; margin-top: 0;">Your Verification Code</h2>
                            <p>You requested to {purpose_text} SCRAPI. Use the code below to verify your email:</p>
                            
                            <div style="background-color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">
                                    {otp}
                                </div>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Create plain text version
            text = f"""
            SCRAPI - Verification Code
            
            You requested to {purpose_text} SCRAPI.
            
            Your verification code is: {otp}
            
            This code will expire in 10 minutes.
            
            If you didn't request this code, please ignore this email.
            """
            
            # Attach both versions
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"OTP email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {str(e)}")
            raise Exception(f"Failed to send email: {str(e)}")
    
    async def send_account_deletion_email(self, to_email: str, username: str):
        """Send account deletion confirmation email."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] Account deleted: {to_email}")
            return True

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your SCRAPI Account Has Been Deleted"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            # Create HTML content
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #dc3545; margin-top: 0;">Account Deleted</h2>
                            <p>Hello {username},</p>
                            <p>Your SCRAPI account has been successfully deleted as you requested.</p>
                            
                            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold;">What was deleted:</p>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    <li>Your user account and profile</li>
                                    <li>All actors and actor tasks</li>
                                    <li>All schedules and scheduled runs</li>
                                    <li>All run history and results</li>
                                    <li>All saved tasks and datasets</li>
                                    <li>API keys and integrations</li>
                                </ul>
                            </div>
                            
                            <p style="color: #6b7280;">
                                We're sorry to see you go! If you deleted your account by mistake or would like to return in the future, you're always welcome to create a new account.
                            </p>
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                                If you didn't request this deletion, please contact our support team immediately at <a href="mailto:{self.smtp_email}" style="color: #3b82f6;">{self.smtp_email}</a>
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Create plain text version
            text = f"""
            SCRAPI - Account Deleted
            
            Hello {username},
            
            Your SCRAPI account has been successfully deleted as you requested.
            
            What was deleted:
            - Your user account and profile
            - All actors and actor tasks
            - All schedules and scheduled runs
            - All run history and results
            - All saved tasks and datasets
            - API keys and integrations
            
            We're sorry to see you go! If you deleted your account by mistake or would like to return in the future, you're always welcome to create a new account.
            
            If you didn't request this deletion, please contact our support team immediately at {self.smtp_email}
            
            This is an automated email. Please do not reply to this message.
            © 2024 SCRAPI. All rights reserved.
            """
            
            # Attach both versions
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Account deletion confirmation email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send account deletion email to {to_email}: {str(e)}")
            # Don't raise exception - account is already deleted, email is just notification
            return False
    
    async def send_deletion_scheduled_email(self, to_email: str, username: str, deletion_date: str, days_remaining: int):
        """Send email when account deletion is scheduled."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] Deletion scheduled for {to_email} on {deletion_date}")
            return True

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your SCRAPI Account Deletion is Scheduled"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #f59e0b; margin-top: 0;">Account Deletion Scheduled</h2>
                            <p>Hello {username},</p>
                            <p>Your SCRAPI account has been scheduled for deletion.</p>
                            
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold; font-size: 18px; color: #92400e;">
                                    Your account will be permanently deleted on {deletion_date}
                                </p>
                                <p style="margin: 10px 0 0 0; color: #92400e;">
                                    You have <strong>{days_remaining} days</strong> to reactivate your account.
                                </p>
                            </div>
                            
                            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold;">Changed your mind?</p>
                                <p style="margin: 10px 0;">You can reactivate your account anytime before {deletion_date} by simply logging in to SCRAPI.</p>
                                <div style="text-align: center; margin-top: 15px;">
                                    <a href="{os.getenv('FRONTEND_URL', 'https://app.scrapi.com')}/login" 
                                       style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                        Reactivate My Account
                                    </a>
                                </div>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                If you don't reactivate within {days_remaining} days, all your data including actors, runs, datasets, and API keys will be permanently deleted.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            text = f"""
            SCRAPI - Account Deletion Scheduled
            
            Hello {username},
            
            Your SCRAPI account has been scheduled for deletion.
            
            Your account will be permanently deleted on {deletion_date}
            You have {days_remaining} days to reactivate your account.
            
            Changed your mind?
            You can reactivate your account anytime before {deletion_date} by simply logging in to SCRAPI.
            
            If you don't reactivate within {days_remaining} days, all your data will be permanently deleted.
            
            © 2024 SCRAPI. All rights reserved.
            """
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Deletion scheduled email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send deletion scheduled email: {str(e)}")
            return False
    
    async def send_deletion_reminder_email(self, to_email: str, username: str, days_remaining: int, deletion_date):
        """Send reminder email for pending account deletion."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] Deletion reminder for {to_email} ({days_remaining} days left)")
            return True

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Reminder: Your SCRAPI Account Will Be Deleted in {days_remaining} Days"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            deletion_date_str = deletion_date.strftime("%B %d, %Y at %I:%M %p UTC")
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #dc3545; margin-top: 0;">⚠️ Final Reminder</h2>
                            <p>Hello {username},</p>
                            <p>This is a reminder that your SCRAPI account is scheduled for permanent deletion.</p>
                            
                            <div style="background-color: #fee2e2; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold; font-size: 18px; color: #991b1b;">
                                    Only {days_remaining} days remaining!
                                </p>
                                <p style="margin: 10px 0 0 0; color: #991b1b;">
                                    Your account will be permanently deleted on<br><strong>{deletion_date_str}</strong>
                                </p>
                            </div>
                            
                            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold;">Want to keep your account?</p>
                                <p style="margin: 10px 0;">Simply log in to SCRAPI to reactivate your account and cancel the deletion.</p>
                                <div style="text-align: center; margin-top: 15px;">
                                    <a href="{os.getenv('FRONTEND_URL', 'https://app.scrapi.com')}/login" 
                                       style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                        Reactivate My Account Now
                                    </a>
                                </div>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                If you take no action, all your data will be permanently deleted and cannot be recovered.
                            </p>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            text = f"""
            SCRAPI - Final Deletion Reminder
            
            Hello {username},
            
            This is a reminder that your SCRAPI account is scheduled for permanent deletion.
            
            Only {days_remaining} days remaining!
            Your account will be permanently deleted on {deletion_date_str}
            
            Want to keep your account?
            Simply log in to SCRAPI to reactivate your account and cancel the deletion.
            
            If you take no action, all your data will be permanently deleted and cannot be recovered.
            
            © 2024 SCRAPI. All rights reserved.
            """
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Deletion reminder sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send deletion reminder: {str(e)}")
            return False
    
    async def send_account_reactivated_email(self, to_email: str, username: str):
        """Send email when account is reactivated."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] Account reactivated: {to_email}")
            return True

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your SCRAPI Account Has Been Reactivated"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #10b981; margin-top: 0;">🎉 Welcome Back!</h2>
                            <p>Hello {username},</p>
                            <p>Your SCRAPI account has been successfully reactivated.</p>
                            
                            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: bold;">Your account is now active</p>
                                <p style="margin: 10px 0 0 0;">All your data has been preserved:</p>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    <li>Actors and actor tasks</li>
                                    <li>Schedules and runs</li>
                                    <li>Datasets and saved tasks</li>
                                    <li>API keys and integrations</li>
                                </ul>
                            </div>
                            
                            <p style="color: #6b7280;">
                                We're glad you decided to stay! You can continue using SCRAPI as usual.
                            </p>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <a href="{os.getenv('FRONTEND_URL', 'https://app.scrapi.com')}/home" 
                                   style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    Go to Dashboard
                                </a>
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            text = f"""
            SCRAPI - Account Reactivated
            
            Hello {username},
            
            Your SCRAPI account has been successfully reactivated.
            
            Your account is now active and all your data has been preserved.
            
            We're glad you decided to stay!
            
            © 2024 SCRAPI. All rights reserved.
            """
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Account reactivation email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send reactivation email: {str(e)}")
            return False

    async def send_password_reset_email(self, to_email: str, username: str, reset_link: str):
        """Send password reset email."""
        # if os.getenv('APP_ENV') != 'production':
        #     logger.info(f"[MOCK EMAIL] Password reset for {to_email}: {reset_link}")
        #     return True
        logger.warning(f"Password reset for {to_email}: {reset_link}")

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = "Reset Your SCRAPI Password"
            message["From"] = self.smtp_email
            message["To"] = to_email
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1f2937;">SCRAPI</h1>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
                            <p>Hello {username},</p>
                            <p>We received a request to reset the password for your SCRAPI account. Click the button below to set a new password:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{reset_link}" 
                                   style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                                    Reset Password
                                </a>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px;">
                                This link will expire in 60 minutes. If you didn't request a password reset, you can safely ignore this email.
                            </p>
                            
                            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 12px; margin-bottom: 5px;">If the button above doesn't work, copy and paste this URL into your browser:</p>
                                <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">{reset_link}</p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px;">
                            <p>© 2024 SCRAPI. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            text = f"""
            SCRAPI - Password Reset
            
            Hello {username},
            
            We received a request to reset your SCRAPI password.
            
            Copy and paste the link below into your browser to set a new password:
            {reset_link}
            
            This link will expire in 60 minutes.
            
            If you didn't request this, please ignore this email.
            """
            
            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_email, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Password reset email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            return False


    async def send_payment_confirmation(
        self,
        to_emails: list,
        invoice_no: str,
        invoice_id: str,
        plan: str,
        billing_cycle: str,
        amount: float,
        subtotal: float,
        tax_amount: float,
        payment_method: str,
        issued_date: str,
        billing_name: str = None,
        proration_discount: float = 0.0,
        account_balance_used: float = 0.0,
        total_addon_cost: float = 0.0,
        overflow_credited: float = 0.0,
        pdf_content: bytes = None,
        invoice_filename: str = "invoice.pdf"
    ):
        """Send a payment confirmation / receipt email. Only sent in production."""
        if os.getenv('APP_ENV') != 'production':
            logger.info(f"[MOCK EMAIL] Payment confirmation for {invoice_no} to {to_emails}")
            return True

        frontend_url = os.getenv('FRONTEND_URL', 'https://app.scrapi.com')
        invoice_url = f"{frontend_url}/billing/invoices/{invoice_id}"
        name_display = billing_name or "Customer"
        year = datetime.now().year

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Confirmation — Scrapi</title>
</head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde3ec;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- ─── HEADER ─────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1929 0%,#1e3a5f 100%);padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#2563eb;width:44px;height:44px;border-radius:10px;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:22px;font-weight:900;line-height:44px;">S</span>
                        </td>
                        <td style="padding-left:14px;">
                          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Scrapi</p>
                          <p style="margin:0;color:#60a5fa;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Console</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#86efac;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                      ✓&nbsp;&nbsp;Payment Confirmed
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── HERO AMOUNT BAND ───────────────────────── -->
          <tr>
            <td style="background:#f0f7ff;border-bottom:1px solid #dde3ec;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;">Amount Charged</p>
              <p style="margin:0;font-size:52px;font-weight:900;color:#0f172a;letter-spacing:-2px;line-height:1;">${amount:.2f}<span style="font-size:18px;font-weight:600;color:#64748b;letter-spacing:0;"> USD</span></p>
              <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">{plan.capitalize()} Plan &bull; {billing_cycle} &bull; via {payment_method.capitalize()}</p>
            </td>
          </tr>

          <!-- ─── GREETING ───────────────────────────────── -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0f172a;">Thank you, {name_display}!</h2>
              <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
                Your payment was captured successfully and your <strong>{plan.capitalize()} subscription</strong> is now active.
                Below is a summary of this transaction — you can view or download the full invoice using the buttons at the bottom.
              </p>
            </td>
          </tr>

          <!-- ─── INVOICE DETAIL TABLE ───────────────────── -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <td colspan="2" style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Order & Payment Details</p>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;width:140px;">Invoice #</td>
                  <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;font-family:monospace;">{invoice_no}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;background:#fafbfc;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Workspace ID</td>
                  <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;font-family:monospace;">{invoice_id[:12]}... (View full in app)</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Account Email</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">{to_emails[0]}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;background:#fafbfc;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Plan</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">{plan.capitalize()} &mdash; {billing_cycle}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Payment Method</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;text-transform:capitalize;">{payment_method}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;background:#fafbfc;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Issued Date</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">{issued_date}</td>
                </tr>
                {f'''
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#059669;">Unused Plan Credit</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#059669;text-align:right;">-${proration_discount:.2f}</td>
                </tr>''' if proration_discount > 0 else ''}
                {f'''
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#2563eb;">Credit Balance Applied</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#2563eb;text-align:right;">-${account_balance_used:.2f}</td>
                </tr>''' if account_balance_used > 0 else ''}
                {f'''
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#2563eb;">Credit Balance Saved</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#2563eb;text-align:right;">+${overflow_credited:.2f}</td>
                </tr>''' if overflow_credited > 0 else ''}
                <tr style="border-bottom:1px solid #f1f5f9;background:#fafbfc;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Plan Subtotal</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">${subtotal:.2f}</td>
                </tr>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 20px;font-size:14px;color:#64748b;">Subtotal (Add-ons)</td>
                  <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-align:right;">${total_addon_cost:.2f}</td>
                </tr>
                <tr style="background:#f0f7ff;">
                  <td style="padding:16px 20px;font-size:15px;font-weight:800;color:#0f172a;">Total Paid</td>
                  <td style="padding:16px 20px;font-size:20px;font-weight:900;color:#2563eb;text-align:right;">${amount:.2f} USD</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── CTA BUTTONS ────────────────────────────── -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <table align="center" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 8px 0 0;">
                    <a href="{invoice_url}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9px;letter-spacing:0.3px;">
                      View Invoice &rarr;
                    </a>
                  </td>
                  <td style="padding:0 0 0 8px;">
                    <a href="{invoice_url}?download=1"
                       style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 28px;border-radius:9px;letter-spacing:0.3px;">
                      &#8681;&nbsp; Download PDF
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
                Buttons not working? Copy this link into your browser:<br/>
                <a href="{invoice_url}" style="color:#3b82f6;word-break:break-all;">{invoice_url}</a>
              </p>
            </td>
          </tr>

          <!-- ─── DIVIDER ────────────────────────────────── -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
            </td>
          </tr>

          <!-- ─── SUPPORT NOTE ───────────────────────────── -->
          <tr>
            <td style="padding:24px 40px;background:#f8fafc;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#334155;">Need help?</p>
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
                      If you have any questions about this invoice, our support team is here to help.<br/>
                      Reach us at <a href="mailto:billing@scrapi.io" style="color:#2563eb;font-weight:600;">billing@scrapi.io</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ─── FOOTER ─────────────────────────────────── -->
          <tr>
            <td style="background:#0f172a;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#475569;line-height:1.8;">
                © {year} Scrapi Technologies Pvt. Ltd. &nbsp;&bull;&nbsp; Chennai, Tamil Nadu — 600001, India<br/>
                <a href="{frontend_url}" style="color:#60a5fa;text-decoration:none;">scrapi.io</a>
                &nbsp;&bull;&nbsp;
                <a href="mailto:billing@scrapi.io" style="color:#60a5fa;text-decoration:none;">billing@scrapi.io</a>
              </p>
              <p style="margin:10px 0 0;font-size:10px;color:#334155;">This is an automated transactional email. Please do not reply directly to this message.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        text = f"""
Scrapi — Payment Confirmation
==============================

Thank you, {name_display}!

Your {plan.capitalize()} plan ({billing_cycle}) is now active.

Invoice Summary
---------------
Invoice No.   : {invoice_no}
Account       : {to_emails[0]}
Plan          : {plan.capitalize()} — {billing_cycle}
Payment Method: {payment_method.capitalize()}
Date          : {issued_date}

Plan Subtotal : ${subtotal:.2f} USD
{f"Unused Credit : -${proration_discount:.2f} USD" if proration_discount > 0 else ""}
{f"Credit Balance Applied : -${account_balance_used:.2f} USD" if account_balance_used > 0 else ""}
{f"Credit Balance Saved : +${overflow_credited:.2f} USD" if overflow_credited > 0 else ""}
Add-ons Total : ${total_addon_cost:.2f} USD
Total Paid    : ${amount:.2f} USD

View Invoice  : {invoice_url}
Download PDF  : {invoice_url}?download=1

Questions? Contact billing@scrapi.io
© {year} Scrapi Technologies Pvt. Ltd. — Chennai, India
        """

        sent_to = set()
        for email in to_emails:
            if not email or email in sent_to:
                continue
            try:
                message = MIMEMultipart("alternative")
                message["Subject"] = f"Payment Confirmed — #{invoice_no} | Scrapi"
                message["From"] = self.smtp_email
                message["To"] = email
                message.attach(MIMEText(text, "plain"))
                message.attach(MIMEText(html, "html"))

                # ── Attach PDF ────────────────────────────────
                if pdf_content:
                    attachment = MIMEApplication(pdf_content, _subtype="pdf")
                    attachment.add_header('Content-Disposition', 'attachment', filename=invoice_filename)
                    message.attach(attachment)
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_email, self.smtp_password)
                    server.send_message(message)
                sent_to.add(email)
                logger.info(f"Payment confirmation email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send payment confirmation to {email}: {str(e)}")


# Singleton instance
_email_service = None

def get_email_service():
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service

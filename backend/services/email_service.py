import smtplib
import os
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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


# Singleton instance
_email_service = None

def get_email_service():
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service

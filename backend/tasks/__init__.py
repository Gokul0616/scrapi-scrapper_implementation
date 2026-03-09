"""
Celery tasks package for Scrapi.
"""
from .scraping_tasks import execute_scraping_job

__all__ = ['execute_scraping_job']

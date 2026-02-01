#!/bin/bash
# Quick Reference Card for Scrapi

cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                  🚀 SCRAPI QUICK REFERENCE                    ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📁 STARTUP SCRIPTS                                           ║
║  ─────────────────────────────────────────────────────────    ║
║  bash /app/start-scrapi.sh          → Interactive launcher   ║
║  bash /app/start-normal.sh          → Main application       ║
║  bash /app/start-admin-console.sh   → Admin console          ║
║  bash /app/start-landing-site.sh    → Landing site           ║
║  bash /app/check-dependencies.sh    → Check dependencies     ║
║                                                               ║
║  🌐 ACCESS URLS                                               ║
║  ─────────────────────────────────────────────────────────    ║
║  http://localhost:3000              → Frontend/UI            ║
║  http://localhost:8001              → Backend API            ║
║  http://localhost:8001/docs         → API Documentation      ║
║                                                               ║
║  🔧 SERVICE MANAGEMENT                                        ║
║  ─────────────────────────────────────────────────────────    ║
║  sudo supervisorctl status          → Check status           ║
║  sudo supervisorctl restart backend → Restart backend        ║
║  sudo supervisorctl restart frontend→ Restart frontend       ║
║  sudo supervisorctl restart all     → Restart all            ║
║                                                               ║
║  📋 VIEW LOGS                                                 ║
║  ─────────────────────────────────────────────────────────    ║
║  tail -f /var/log/supervisor/backend.out.log                 ║
║  tail -f /var/log/supervisor/backend.err.log                 ║
║  tail -f /var/log/supervisor/frontend.out.log                ║
║  tail -f /var/log/supervisor/frontend.err.log                ║
║  tail -f /var/log/admin-console.log                          ║
║  tail -f /var/log/landing-site.log                           ║
║                                                               ║
║  🐛 TROUBLESHOOTING                                           ║
║  ─────────────────────────────────────────────────────────    ║
║  1. Check dependencies:                                       ║
║     bash /app/check-dependencies.sh                           ║
║                                                               ║
║  2. Check service logs:                                       ║
║     tail -f /var/log/supervisor/*.err.log                     ║
║                                                               ║
║  3. Reinstall dependencies:                                   ║
║     cd /app/backend && pip install -r requirements.txt        ║
║     cd /app/frontend && yarn install                          ║
║                                                               ║
║  4. Kill stuck processes:                                     ║
║     lsof -ti:3000 | xargs kill -9                             ║
║     lsof -ti:8001 | xargs kill -9                             ║
║                                                               ║
║  📚 DOCUMENTATION                                             ║
║  ─────────────────────────────────────────────────────────    ║
║  Full guide: cat /app/STARTUP_GUIDE.md                        ║
║  This card:  bash /app/quick-ref.sh                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF

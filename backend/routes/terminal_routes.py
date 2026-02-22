from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from typing import List, Dict
import os
import pty
import select
import termios
import struct
import fcntl
import subprocess
import asyncio
import logging
import json
import tempfile
import shutil
from pathlib import Path
from auth import get_current_user, decode_token

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.fd_map: Dict[str, int] = {}  # Map client_id to pty file descriptor
        self.process_map: Dict[str, subprocess.Popen] = {} # Map client_id to process

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Clean up pty session
        if client_id in self.fd_map:
            fd = self.fd_map[client_id]
            try:
                os.close(fd)
            except OSError:
                pass
            del self.fd_map[client_id]
            
        if client_id in self.process_map:
            proc = self.process_map[client_id]
            try:
                proc.terminate()
                proc.wait()
            except Exception:
                pass
            del self.process_map[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

async def read_from_pty(client_id: str, fd: int):
    """
    Read (process stdout/stderr) from the PTY and push to the websocket.
    """
    max_read_bytes = 1024 * 20
    while True:
        await asyncio.sleep(0.01)
        try:
            timeout_sec = 0
            (r, w, x) = select.select([fd], [], [], timeout_sec)
            if fd in r:
                data = os.read(fd, max_read_bytes)
                if not data:
                    # EOF
                    logger.info(f"EOF or no data from PTY for {client_id}")
                    break
                try:
                    valid_str = data.decode('utf-8', 'replace')
                    await manager.send_personal_message(valid_str, client_id)
                except Exception as e:
                    logger.error(f"Error sending to websocket: {e}")
                    break
        except OSError:
            # PTY closed
            break
        except Exception as e:
            logger.error(f"Error reading from PTY: {e}")
            break
            
    manager.disconnect(client_id)

@router.websocket("/terminal/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, token: str):
    """
    WebSocket endpoint for terminal access.
    Validates token and permissions.
    """
    # Verify Authentication
    try:
        user_info = decode_token(token)
        user_id = user_info.get("sub")
        role = user_info.get("role")
        
        from database import get_db
        db = get_db()
        if db is None:
             await websocket.close(code=4000)
             return

        user_doc = await db.admin_users.find_one({"id": user_id})
        if not user_doc:
             await websocket.close(code=4001)
             return
             
        user_permissions = user_doc.get("permissions", [])
        
        if role != "owner" and "terminal_access" not in user_permissions:
            logger.warning(f"Unauthorized terminal access attempt by {user_doc['username']}")
            await websocket.close(code=4003) # Forbidden
            return

    except Exception as e:
        logger.error(f"Auth failed for WS: {e}")
        await websocket.close(code=4002)
        return

    await manager.connect(websocket, client_id)
    
    # Create PTY
    shell = os.environ.get('SHELL', '/bin/zsh' if os.path.exists('/bin/zsh') else '/bin/bash')
    if not os.path.exists(shell):
        shell = '/bin/sh'
    
    logger.info(f"Starting terminal with shell: {shell}")
    
    try:
        pid, fd = pty.fork()
    except OSError as e:
        logger.error(f"PTY fork failed: {e}")
        await websocket.close(code=1011, reason=f"PTY fork failed: {str(e)}")
        return

    if pid == 0:
        # Child process
        try:
            # Resolve absolute project root
            project_root = str(Path(__file__).resolve().parent.parent.parent)
            
            # Start inside the project root
            os.chdir(project_root)
            
            # Set critical environment variables
            os.environ['PROJECT_ROOT'] = project_root
            os.environ['HOME'] = project_root
            
            # ---------------------------------------------------------------
            # CROSS-SHELL RESTRICTION STRATEGY:
            # 
            # Supports both BASH and ZSH.
            # BASH uses PROMPT_COMMAND.
            # ZSH uses precmd_functions.
            # ---------------------------------------------------------------
            
            restrict_script = f'''
# === SCRAPI ADMIN TERMINAL RESTRICTION ===
export PROJECT_ROOT="{project_root}"
export HOME="{project_root}"

# Guard function to enforce project root
_scrapi_enforce_root() {{
    local cwd
    cwd="$(pwd -L 2>/dev/null || pwd)"
    
    # Check if we are still within project root
    if [[ "$cwd" != "{project_root}"* ]]; then
        echo ""
        echo -e "\\033[1;31m[SCRAPI] Access denied:\\033[0m Cannot leave project directory."
        echo -e "\\033[33mReturning to: {project_root}\\033[0m"
        builtin cd "{project_root}" 2>/dev/null
    fi
}}

# BASH setup
if [ -n "$BASH_VERSION" ]; then
    PROMPT_COMMAND="_scrapi_enforce_root; $PROMPT_COMMAND"
fi

# ZSH setup
if [ -n "$ZSH_VERSION" ]; then
    autoload -Uz add-zsh-hook
    add-zsh-hook precmd _scrapi_enforce_root
fi

# SH setup (basic support via PS1 if possible, but limited)
if [ -z "$BASH_VERSION" ] && [ -z "$ZSH_VERSION" ]; then
    export PS1="`_scrapi_enforce_root`$PS1"
fi

# Function overrides for immediate feedback
cd() {{
    if [ "$#" -eq 0 ] || [ "$1" = "~" ]; then
        builtin cd "{project_root}"
    else
        builtin cd "$@" 2>/dev/null || {{ echo -e "\\033[31mcd: no such directory\\033[0m"; return 1; }}
    fi
}}
alias pushd='cd'
alias popd='cd {project_root}'
builtin cd "{project_root}" 2>/dev/null
clear
echo -e "\\033[1;32m╔══════════════════════════════════════════════════════════╗\\033[0m"
echo -e "\\033[1;32m║        Welcome to Scrapi Admin Terminal                  ║\\033[0m"
echo -e "\\033[1;32m╚══════════════════════════════════════════════════════════╝\\033[0m"
echo ""
'''

            # We need to make sure the shell actually SOURCES this script.
            # For BASH, --rcfile works.
            # For ZSH, we can use ZDOTDIR or source it via a temporary .zshrc.
            
            temp_dir = tempfile.mkdtemp(prefix="scrapi_term_")
            init_file_path = os.path.join(temp_dir, "init.sh")
            with open(init_file_path, "w") as f:
                f.write(restrict_script)
            
            if 'zsh' in shell:
                # For zsh, we create a .zshrc in the temp dir and set ZDOTDIR
                zshrc_path = os.path.join(temp_dir, ".zshrc")
                with open(zshrc_path, "w") as f:
                    f.write(f'source {init_file_path}\n')
                    # Also source system zshrc if it exists to keep common aliases/settings
                    if os.path.exists('/etc/zshrc'):
                        f.write('source /etc/zshrc\n')
                
                os.environ['ZDOTDIR'] = temp_dir
                os.execv(shell, [shell])
            elif 'bash' in shell:
                os.execv(shell, [shell, '--rcfile', init_file_path])
            else:
                # Fallback for other shells
                os.environ['ENV'] = init_file_path
                os.execv(shell, [shell, '-i'])
                
        except Exception as e:
            logger.error(f"Failed to exec shell: {e}")
            exit(1)
    else:
        # Parent process
        manager.fd_map[client_id] = fd
        asyncio.create_task(read_from_pty(client_id, fd))
        
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, dict) and parsed.get('type') == 'resize':
                        cols = parsed.get('cols', 80)
                        rows = parsed.get('rows', 24)
                        winsize = struct.pack("HHHH", rows, cols, 0, 0)
                        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
                        continue
                except json.JSONDecodeError:
                    pass
                os.write(fd, data.encode('utf-8'))
        except WebSocketDisconnect:
            manager.disconnect(client_id)
        except Exception as e:
            logger.error(f"WS error: {e}")
            manager.disconnect(client_id)

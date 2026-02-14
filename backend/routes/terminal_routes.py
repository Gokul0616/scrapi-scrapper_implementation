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
                # Send data to websocket
                # xterm.js expects string data, but raw bytes might be needed for some encodings.
                # Usually safely decodable as utf-8.
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
        
        # Check permissions: Owner OR 'terminal_access' permission
        # To strictly check permissions we would need to query DB, but we put permissions in token?
        # If permissions are NOT in token, we should query DB or update token logic.
        # For now, let's assume valid token means user is logged in. 
        # We perform a double-check against DB logic if needed, but for performance let's trust token + an extra DB check if critical.
        
        # NOTE: WE NEED TO FETCH USER TO CHECK PERMISSIONS IF THEY ARE NOT IN TOKEN (Token update in auth.py comes next)
        # But wait, we haven't updated auth.py to put permissions in token yet. 
        # So we must fetch user from DB here to be safe.
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
    # SHELL env usually /bin/bash or /bin/zsh or /bin/sh
    shell = os.environ.get('SHELL', 'sh')
    
    try:
        pid, fd = pty.fork()
    except OSError as e:
        logger.error(f"PTY fork failed: {e}")
        await websocket.close()
        return

    if pid == 0:
        # Child process
        os.execv(shell, [shell])
    else:
        # Parent process
        manager.fd_map[client_id] = fd
        # We don't have exactly process object here from pty.fork(), 
        # but we have pid. cleaning up might need os.waitpid(pid)
        # To keep it simple in python, we might use subprocess.Popen with pty if needed, 
        # but pty.fork is standard for terminals.
        
        # Start background task to read from pty
        asyncio.create_task(read_from_pty(client_id, fd))
        
        try:
            while True:
                data = await websocket.receive_text()
                # If data is a resize command (custom protocol), handle it.
                # Or if it starts with special char?
                # Simple implementation: All text is input, unless JSON for resize.
                
                try:
                    parsed = json.loads(data)
                    if isinstance(parsed, dict) and parsed.get('type') == 'resize':
                        cols = parsed.get('cols', 80)
                        rows = parsed.get('rows', 24)
                        # Set window size
                        winsize = struct.pack("HHHH", rows, cols, 0, 0)
                        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)
                        continue
                except json.JSONDecodeError:
                    pass
                
                # Write to PTY
                os.write(fd, data.encode('utf-8'))
                
        except WebSocketDisconnect:
            manager.disconnect(client_id)
        except Exception as e:
            logger.error(f"WS error: {e}")
            manager.disconnect(client_id)

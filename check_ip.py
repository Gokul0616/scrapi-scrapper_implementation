import socket

hostname = "mail.idlbay.com"
try:
    ip_address = socket.gethostbyname(hostname)
    print(f"IP Address for {hostname}: {ip_address}")
except Exception as e:
    print(f"Error resolving {hostname}: {e}")

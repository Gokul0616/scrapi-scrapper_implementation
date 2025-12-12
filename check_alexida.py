import socket
import dns.resolver

domain = "alexida.com"
print(f"Checking details for {domain}...")

try:
    # MX
    answers = dns.resolver.resolve(domain, 'MX')
    for rdata in answers:
        mx_host = str(rdata.exchange).rstrip('.')
        print(f"MX: {mx_host}")
        try:
            ip = socket.gethostbyname(mx_host)
            print(f"  IP: {ip}")
        except:
            print("  IP: Could not resolve")

except Exception as e:
    print(f"Error: {e}")

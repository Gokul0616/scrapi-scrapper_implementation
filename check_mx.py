import dns.resolver

domain = "idlbay.com"
print(f"Checking MX records for {domain}...")

try:
    answers = dns.resolver.resolve(domain, 'MX')
    for rdata in answers:
        print(f"MX Preference: {rdata.preference} Exchange: {rdata.exchange}")
except Exception as e:
    print(f"Error: {e}")

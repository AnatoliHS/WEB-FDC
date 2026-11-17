import re
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

file_path = os.path.join(ROOT, "scratch_findrealestate.html")
try:
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
        
    print("HTML Length:", len(html))
    
    # Find CSS stylesheet urls
    css_urls = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(.*?)"', html)
    print("CSS URLs found:")
    for url in css_urls:
        print("-", url)
        # Download the CSS files using curl
        full_url = url if url.startswith('http') else 'https://findrealestate.com' + url
        name = url.split('/')[-1].split('?')[0] # Remove query parameters like dpl=...
        dest_path = os.path.join(ROOT, name)
        
        # Run curl command
        curl_cmd = f'curl -sL "{full_url}" > "{dest_path}"'
        print(f"Running: {curl_cmd}")
        os.system(curl_cmd)
        
        if os.path.exists(dest_path):
            print(f"Saved {name}, size: {os.path.getsize(dest_path)} bytes")
            
except Exception as e:
    print("Error:", e)

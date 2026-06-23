import requests

headers = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

url = "https://www.bseindia.com/xml-data/corpfiling/AttachHis/d57e49b6-fd89-4fa8-b591-4f590100db1e.pdf"
print("Downloading from BSE xml-data link:", url)
res = requests.get(url, headers=headers, stream=True)
print("Status code:", res.status_code)
print("Content-type:", res.headers.get("content-type"))
content = res.raw.read(100)
print("First 100 bytes of content:", content)

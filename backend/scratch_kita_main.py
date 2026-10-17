import asyncio
import httpx
from app.services.kita_client import KitaClient

async def main():
    client = KitaClient()
    token = await client.get_token()
    print("Token:", token)
    
    url = f"{client.base_url}/maindashboard/GetMainDashboardData"
    payload = {"periodmonth": "09", "periodyear": "2026", "distributor_id": "D001"}
    headers = {
        "appid": client.appid,
        "token": token,
        "content-type": "application/json"
    }
    
    async with httpx.AsyncClient(verify=False) as c:
        resp = await c.post(url, json=payload, headers=headers)
        print("URL 1:", url, resp.status_code)
        if resp.status_code == 200:
            print(resp.json())

        # Try another endpoint name
        url2 = f"{client.base_url}/main/GetMainDashboard"
        resp2 = await c.post(url2, json=payload, headers=headers)
        print("URL 2:", url2, resp2.status_code)

        # Try another endpoint name
        url3 = f"{client.base_url}/home/GetHomeData"
        resp3 = await c.post(url3, json=payload, headers=headers)
        print("URL 3:", url3, resp3.status_code)
        
        # Try sales performance
        url4 = f"{client.base_url}/salesperformance/GetSalesPerformanceData"
        resp4 = await c.post(url4, json=payload, headers=headers)
        print("URL 4:", url4, resp4.status_code)

asyncio.run(main())

"""
Client service for integrating with KITA Dashboard (Picture of Success) API.
Handles auto-authentication and read-only data fetching.
"""
import time
import logging
import calendar
import httpx
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

KITA_BASE_URL = "https://www.kita-dashboard.id:9999/shell/dashboard"
KITA_EMAIL = "adhimas@pengajaran.com"
KITA_PASSWORD = "Admin1234*"
KITA_APPID = "KITA"


class KitaClient:
    _instance = None
    _token: Optional[str] = None
    _token_timestamp: float = 0
    _token_ttl: float = 3600  # 1 hour cache

    def __init__(self):
        self.base_url = KITA_BASE_URL
        self.email = KITA_EMAIL
        self.password = KITA_PASSWORD
        self.appid = KITA_APPID

    async def get_token(self, force_refresh: bool = False) -> str:
        """Fetch or return cached authentication token."""
        now = time.time()
        if not force_refresh and self._token and (now - self._token_timestamp < self._token_ttl):
            return self._token

        logon_url = f"{self.base_url}/authentication/logon"
        headers = {
            "appid": self.appid,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = {
            "email": self.email,
            "password": self.password,
        }

        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            try:
                resp = await client.post(logon_url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                if data.get("bSuccess") and data.get("token"):
                    self._token = data.get("token")
                    self._token_timestamp = now
                    logger.info("Successfully authenticated with KITA Dashboard API")
                    return self._token
                else:
                    raise ValueError(f"KITA logon returned unsuccessful: {data.get('szMessage', 'Unknown error')}")
            except Exception as e:
                logger.error(f"Error authenticating with KITA API: {e}")
                # If we have an existing token, try using it as fallback
                if self._token:
                    return self._token
                raise

    def _build_payload(self, year: int = 2026, month: int = 9) -> Dict[str, Any]:
        """Build standard filter payload for KITA Picture of Success API."""
        return {
            "areas": [],
            "workplaces": [],
            "positions": [],
            "year": year,
            "month": month,
            "groupSector": [],
            "subSector": [],
            "status": [],
            "cusType": [],
            "sector": [],
            "channel": [],
            "detailChannel": [],
            "remark1List": [],
            "remark2List": [],
            "remark3List": [],
            "remark4List": [],
            "remark5List": [],
            "remark6List": [],
            "remark7List": [],
            "remark8List": [],
            "subOrdinateList": [],
        }

    async def get_picture_of_success_data(self, year: int = 2026, month: int = 9) -> Dict[str, Any]:
        """Fetch summary Picture of Success KPI metrics for a given year & month."""
        token = await self.get_token()
        url = f"{self.base_url}/pictureofsuccess/GetPictureOfSuccessData"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = self._build_payload(year=year, month=month)

        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 401 or resp.status_code == 403:
                    # Token might have expired, try once more with forced refresh
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetPictureOfSuccessData from KITA: {e}")
                raise

    async def get_picture_of_success_monthly_trends(self, year: int = 2026) -> List[Dict[str, Any]]:
        """Fetch 12-month trend list data for Picture of Success."""
        token = await self.get_token()
        url = f"{self.base_url}/pictureofsuccess/GetPictureOfSuccessListData"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = self._build_payload(year=year, month=9)

        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 401 or resp.status_code == 403:
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetPictureOfSuccessListData from KITA: {e}")
                raise

    async def get_sales_performance_data(self, year: int = 2026, month: int = 9, area: Optional[str] = None) -> Dict[str, Any]:
        """Fetch sales performance target vs actual data from KITA Dashboard API."""
        token = await self.get_token()
        url = f"{self.base_url}/salesperformance/GetSalesPerformanceData"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        _, last_day = calendar.monthrange(year, month)
        date_from = f"{year:04d}-{month:02d}-01T00:00:00"
        date_to = f"{year:04d}-{month:02d}-{last_day:02d}T23:59:59"

        payload = {
            "areas": [area] if area else [],
            "year": year,
            "month": month,
            "from": date_from,
            "to": date_to,
            "workplaces": [],
            "positions": [],
            "productType": [],
            "brand": [],
            "subBrand": [],
            "sku": [],
            "employee": [],
            "groupSector": [],
            "subSector": [],
            "status": [],
            "cusType": [],
            "sector": [],
            "sectors": [],
            "channel": [],
            "detailChannel": [],
            "remark1": [],
            "remark2": [],
            "remark3": [],
            "remark4": [],
            "remark5": [],
            "remark6": [],
            "remark7": [],
            "remark8": [],
            "bPeriod": False,
            "type": 1,
        }

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetSalesPerformanceData from KITA: {e}")
                raise

    async def get_sector_mix_data(self, year: int = 2026, month: int = 9) -> Dict[str, Any]:
        """Fetch sector mix graphic data from KITA Dashboard API."""
        token = await self.get_token()
        url = f"{self.base_url}/salesperformance/GetSectorMixGraphic"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        _, last_day = calendar.monthrange(year, month)
        date_from = f"{year:04d}-{month:02d}-01T00:00:00"
        date_to = f"{year:04d}-{month:02d}-{last_day:02d}T23:59:59"

        payload = {
            "areas": [],
            "year": year,
            "month": month,
            "from": date_from,
            "to": date_to,
            "workplaces": [],
            "positions": [],
            "productType": [],
            "brand": [],
            "subBrand": [],
            "sku": [],
            "employee": [],
            "groupSector": [],
            "subSector": [],
            "status": [],
            "cusType": [],
            "sector": [],
            "sectors": [],
            "channel": [],
            "detailChannel": [],
            "remark1": [],
            "remark2": [],
            "remark3": [],
            "remark4": [],
            "remark5": [],
            "remark6": [],
            "remark7": [],
            "remark8": [],
            "bPeriod": False,
            "type": 1,
        }

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetSectorMixGraphic from KITA: {e}")
                raise

    async def get_customer_list(
        self,
        year: int = 2026,
        month: int = 9,
        page: int = 0,
        limit: int = 10,
        search: str = "",
        orderby: str = "asc",
        column_order_desc: str = "customerName",
    ) -> Dict[str, Any]:
        """Fetch customer list from KITA Dashboard Customer API."""
        token = await self.get_token()
        url = f"{self.base_url}/DashboardCustomer/GetListCustomer"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        _, last_day = calendar.monthrange(year, month)
        date_from = f"{year:04d}-{month:02d}-01T00:00:00"
        date_to = f"{year:04d}-{month:02d}-{last_day:02d}T23:59:59"

        payload = {
            "search": search,
            "areas": [],
            "icamList": [],
            "channels": [],
            "workplaces": [],
            "roles": [],
            "employeeNames": [],
            "groupSectorList": [],
            "sectorList": [],
            "subsectorList": [],
            "statusList": [],
            "typeList": [],
            "productType": [],
            "brand": [],
            "subBrand": [],
            "sku": [],
            "custRemark1": [],
            "custRemark2": [],
            "custRemark3": [],
            "custRemark4": [],
            "custRemark5": [],
            "custRemark6": [],
            "custRemark7": [],
            "custRemark8": [],
            "detailChannel": [],
            "page": page,
            "limit": limit,
            "bPeriod": False,
            "szGroupCustomer": "",
            "szYear": year,
            "szMonth": month,
            "from": date_from,
            "to": date_to,
            "columnOrder": 0,
            "orderby": orderby,
            "columnOrderDesc": column_order_desc,
        }

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetListCustomer from KITA: {e}")
                raise

    async def get_pipeline_strength_data(self, year: int = 2026, month: int = 9) -> Dict[str, Any]:
        """Fetch pipeline strength breakdown from KITA GetAllPipelineStrength API."""
        token = await self.get_token()
        url = f"{self.base_url}/pictureofsuccess/GetAllPipelineStrength"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = self._build_payload(year=year, month=month)

        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetAllPipelineStrength from KITA: {e}")
                raise

    async def get_pos_table_data(self, tab_type: int = 1, year: int = 2026, month: int = 9, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Fetch Picture of Success focus table data for a specific type (1=CS, 2=BFF, 3=PF, 4=SC, 6=RR)."""
        token = await self.get_token()
        url = f"{self.base_url}/pictureofsuccess/GetPictureOfSuccessTable"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = self._build_payload(year=year, month=month)
        payload["type"] = tab_type
        payload["page"] = page
        payload["limit"] = limit

        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetPictureOfSuccessTable (type={tab_type}) from KITA: {e}")
                raise

    async def get_customer_graphic(self, year: int = 2026, month: int = 9) -> Dict[str, Any]:
        """Fetch customer validity graphic (Total Customer, PANOL, Validation) from KITA API."""
        token = await self.get_token()
        url = f"{self.base_url}/DashboardCustomer/GetCustomerGraphic"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = {
            "areas": [],
            "icamList": [],
            "channels": [],
            "workplaces": [],
            "roles": [],
            "employeeNames": [],
            "groupSectorList": [],
            "sectorList": [],
            "subsectorList": [],
            "statusList": [],
            "typeList": [],
            "custRemark1": [],
            "custRemark2": [],
            "custRemark3": [],
            "custRemark4": [],
            "custRemark5": [],
            "custRemark6": [],
            "custRemark7": [],
            "custRemark8": [],
            "detailChannel": [],
            "month": month,
            "year": year,
            "quarter": 0,
            "bPeriod": False,
        }

        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"Failed to fetch GetCustomerGraphic from KITA: {e}")
                raise

    async def get_key_account_customers(self, year: int = 2026, month: int = 9, limit: int = 25, search: str = "") -> Dict[str, Any]:
        """Fetch Key Account customers from KITA CRM API."""
        token = await self.get_token()
        url = "https://www.kita-dashboard.id:9999/shell/crm/keyaccountcustomer/GetKeyAccountCustomerFilter"
        headers = {
            "appid": self.appid,
            "token": token,
            "content-type": "application/json",
            "origin": "https://www.kita-dashboard.id",
            "referer": "https://www.kita-dashboard.id/",
        }
        payload = {
            "areas": [],
            "icamList": [],
            "channels": [],
            "workplaces": [],
            "roles": [],
            "employeeNames": [],
            "groupSectorList": [],
            "sectorList": [],
            "subsectorList": [],
            "statusList": [],
            "typeList": [],
            "custRemark1": [],
            "custRemark2": [],
            "custRemark3": [],
            "custRemark4": [],
            "custRemark5": [],
            "custRemark6": [],
            "custRemark7": [],
            "custRemark8": [],
            "detailChannel": [],
            "month": month,
            "year": year,
            "quarter": 0,
            "bPeriod": False,
            "page": 1,
            "limit": limit,
            "orderby": "desc",
            "columnOrder": 0,
            "search": search,
        }

        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (401, 403):
                    token = await self.get_token(force_refresh=True)
                    headers["token"] = token
                    resp = await client.post(url, json=payload, headers=headers)

                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.warning(f"Failed to fetch GetKeyAccountCustomerFilter from KITA: {e}")
                return {"data": [], "totalData": 0}


kita_client = KitaClient()




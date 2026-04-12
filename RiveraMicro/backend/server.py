from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List
from datetime import datetime, timezone, timedelta
import httpx
from lxml import etree

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

BUS_XML_URL = "http://microltda.ddns.net:8705/pub/avl.xml"
# How long to keep showing a bus after it disappears from the API (2 hours)
LAST_SEEN_TTL_MINUTES = 120

LINE_COLORS = {
    "1": "#FF3B30",
    "2": "#007AFF",
    "3": "#34C759",
    "5": "#FF9500",
    "6": "#AF52DE",
    "8": "#FF2D55",
    "9": "#5AC8FA",
    "13": "#FFCC00",
}

def parse_bus_xml(xml_bytes: bytes) -> List[dict]:
    buses = []
    try:
        root = etree.fromstring(xml_bytes)
        for marker in root.findall('marker'):
            def txt(tag):
                el = marker.find(tag)
                return el.text.strip() if el is not None and el.text else ''

            lat_str = txt('lat')
            lon_str = txt('lon')
            if not lat_str or not lon_str:
                continue

            heading_str = txt('rum')
            heading = int(heading_str) if heading_str.isdigit() else 0

            line = txt('lin')
            bus = {
                "lat": float(lat_str),
                "lon": float(lon_str),
                "id": txt('id'),
                "busNumber": txt('bus'),
                "licensePlate": txt('bmt'),
                "line": line,
                "routeName": txt('lnm'),
                "departureTime": txt('sal'),
                "currentStop": txt('p1n'),
                "heading": heading,
                "icon": txt('ico'),
                "status": txt('est'),
                "accessible": txt('bac') == '1',
                "color": LINE_COLORS.get(line, "#CCFF00"),
            }
            buses.append(bus)
    except Exception as e:
        logger.error(f"Error parsing XML: {e}")
    return buses


async def save_bus_positions(buses: List[dict]):
    """Save current bus positions to MongoDB for persistence."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        for bus in buses:
            await db.bus_positions.update_one(
                {"busId": bus["id"]},
                {"$set": {
                    "busId": bus["id"],
                    "busNumber": bus["busNumber"],
                    "licensePlate": bus["licensePlate"],
                    "line": bus["line"],
                    "routeName": bus["routeName"],
                    "departureTime": bus["departureTime"],
                    "currentStop": bus["currentStop"],
                    "heading": bus["heading"],
                    "icon": bus["icon"],
                    "accessible": bus["accessible"],
                    "color": bus["color"],
                    "lat": bus["lat"],
                    "lon": bus["lon"],
                    "lastSeenAt": now,
                    "status": bus["status"],
                }},
                upsert=True
            )
    except Exception as e:
        logger.error(f"Error saving bus positions: {e}")


async def get_last_seen_buses(active_ids: set) -> List[dict]:
    """Get buses from DB that are NOT in the current active set but were seen recently."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LAST_SEEN_TTL_MINUTES)).isoformat()
    try:
        cursor = db.bus_positions.find(
            {
                "busId": {"$nin": list(active_ids)},
                "lastSeenAt": {"$gte": cutoff}
            },
            {"_id": 0}
        )
        last_seen = []
        async for doc in cursor:
            last_seen.append({
                "lat": doc["lat"],
                "lon": doc["lon"],
                "id": doc["busId"],
                "busNumber": doc["busNumber"],
                "licensePlate": doc.get("licensePlate", ""),
                "line": doc["line"],
                "routeName": doc.get("routeName", ""),
                "departureTime": doc.get("departureTime", ""),
                "currentStop": doc.get("currentStop", ""),
                "heading": doc.get("heading", 0),
                "icon": doc.get("icon", ""),
                "status": doc.get("status", ""),
                "accessible": doc.get("accessible", False),
                "color": doc.get("color", "#CCFF00"),
                "isLastSeen": True,
                "lastSeenAt": doc["lastSeenAt"],
            })
        return last_seen
    except Exception as e:
        logger.error(f"Error getting last seen buses: {e}")
        return []


@api_router.get("/")
async def root():
    return {"message": "MICRO Rivera Bus Tracker API"}


@api_router.get("/buses")
async def get_buses():
    try:
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(BUS_XML_URL)
            response.raise_for_status()
            active_buses = parse_bus_xml(response.content)

        # Mark active buses
        for bus in active_buses:
            bus["isLastSeen"] = False
            bus["lastSeenAt"] = datetime.now(timezone.utc).isoformat()

        # Save current positions to DB
        await save_bus_positions(active_buses)

        # Get recently seen buses that are no longer active
        active_ids = {b["id"] for b in active_buses}
        last_seen_buses = await get_last_seen_buses(active_ids)

        all_buses = active_buses + last_seen_buses
        return {
            "buses": all_buses,
            "activeCount": len(active_buses),
            "lastSeenCount": len(last_seen_buses),
            "count": len(all_buses),
        }
    except httpx.TimeoutException:
        logger.error("Timeout fetching bus data")
        # On timeout, return last known positions from DB
        return await get_all_from_db()
    except Exception as e:
        logger.error(f"Error fetching buses: {e}")
        # On error, return last known positions from DB
        return await get_all_from_db()


async def get_all_from_db():
    """Fallback: return all recently seen buses from DB."""
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LAST_SEEN_TTL_MINUTES)).isoformat()
    try:
        cursor = db.bus_positions.find(
            {"lastSeenAt": {"$gte": cutoff}},
            {"_id": 0}
        )
        buses = []
        async for doc in cursor:
            buses.append({
                "lat": doc["lat"],
                "lon": doc["lon"],
                "id": doc["busId"],
                "busNumber": doc["busNumber"],
                "licensePlate": doc.get("licensePlate", ""),
                "line": doc["line"],
                "routeName": doc.get("routeName", ""),
                "departureTime": doc.get("departureTime", ""),
                "currentStop": doc.get("currentStop", ""),
                "heading": doc.get("heading", 0),
                "icon": doc.get("icon", ""),
                "status": doc.get("status", ""),
                "accessible": doc.get("accessible", False),
                "color": doc.get("color", "#CCFF00"),
                "isLastSeen": True,
                "lastSeenAt": doc["lastSeenAt"],
            })
        return {"buses": buses, "activeCount": 0, "lastSeenCount": len(buses), "count": len(buses), "fromCache": True}
    except Exception as e:
        logger.error(f"Error reading DB fallback: {e}")
        return {"buses": [], "activeCount": 0, "lastSeenCount": 0, "count": 0, "error": str(e)}


@api_router.get("/lines")
async def get_lines():
    try:
        # Get lines from both active API and saved positions
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(BUS_XML_URL)
            response.raise_for_status()
            buses = parse_bus_xml(response.content)

        # Also get lines from DB for buses that may not be active right now
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=LAST_SEEN_TTL_MINUTES)).isoformat()
        db_buses = await db.bus_positions.find(
            {"lastSeenAt": {"$gte": cutoff}},
            {"_id": 0, "line": 1, "color": 1, "routeName": 1}
        ).to_list(200)

        lines = {}
        for bus in buses + db_buses:
            line = bus.get("line", "")
            if line and line not in lines:
                lines[line] = {
                    "id": line,
                    "name": f"Línea {line}",
                    "color": bus.get("color", LINE_COLORS.get(line, "#CCFF00")),
                    "routeName": bus.get("routeName", ""),
                }
        sorted_lines = sorted(lines.values(), key=lambda x: int(x["id"]) if x["id"].isdigit() else 999)
        return {"lines": sorted_lines}
    except Exception as e:
        logger.error(f"Error fetching lines: {e}")
        return {"lines": []}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

import asyncio
import httpx
import os
import dotenv
from livekit import rtc

async def main():
    payload = {
        "leadId": "LEAD-206",
        "leadName": "Amina Begum",
        "phoneNumber": "+44 7700 900123",
        "courseInquired": "Qualifi Level 4 Diploma in Cyber Security"
    }
    
    print("[TEST] Triggering outbound dial route http://localhost:3000/api/calls/dial ...")
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:3000/api/calls/dial", json=payload, timeout=15.0)
        print(f"[TEST] Status Code: {res.status_code}")
        data = res.json()
        print(f"[TEST] Response: {data}")
        
    if res.status_code != 200 or "token" not in data:
        print("[TEST ERROR] Failed to get token from dial route")
        return
        
    room_name = data["roomName"]
    token = data["token"]
    url = data["url"]
    
    print(f"[TEST] Connecting as participant to room {room_name} ...")
    room = rtc.Room()
    await room.connect(url, token)
    print(f"[TEST] Successfully connected to room: {room.name}")
    
    # Stay in room for 15 seconds to allow worker to join and speak greeting
    print("[TEST] Waiting 15 seconds in room for agent job & greeting...")
    await asyncio.sleep(15)
    
    await room.disconnect()
    print("[TEST] Disconnected from room.")

if __name__ == "__main__":
    asyncio.run(main())

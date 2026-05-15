from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select, SQLModel
from database import create_db, get_db, Room, Order
from typing import Dict
import json
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException
from pathlib import Path

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: str, message: dict):
        for connection in self.active_connections.get(room_id, []):
            await connection.send_text(json.dumps(message))


class OrderCreate(SQLModel):
    person_name: str
    item: str
    price: float

manager = ConnectionManager()



app = FastAPI()



@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


@app.on_event("startup")
def on_startup():
    create_db()



@app.post("/api/rooms")
def create_room(name: str, db: Session = Depends(get_db)):
    room = Room(name=name)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@app.get("/api/rooms/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    orders = db.exec(select(Order).where(Order.room_id == room_id)).all()
    return {"room": room, "orders": orders}

@app.post("/api/rooms/{room_id}/orders")
async def add_order(room_id: str, order_data: OrderCreate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Room is closed")
    order = Order(room_id=room_id, **order_data.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    await manager.broadcast(room_id, {
        "event": "new_order",
        "order": order.model_dump()
    })
    return order

@app.patch("/api/rooms/{room_id}/close")
async def close_room(room_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Room is already closed")
    room.status = "closed"
    db.add(room)
    db.commit()
    db.refresh(room)
    await manager.broadcast(room_id, {"event": "room_closed"})
    return room

@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    orders = db.exec(select(Order).where(Order.room_id == room_id)).all()
    for order in orders:
        db.delete(order)
    db.delete(room)
    db.commit()
    await manager.broadcast(room_id, {"event": "room_deleted"})
    return {"message": "Room deleted"}

@app.patch("/api/rooms/{room_id}/tip")
async def update_tip(room_id: str, tip_percent: float, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Room is closed")
    room.tip_percent = tip_percent
    db.add(room)
    db.commit()
    db.refresh(room)
    await manager.broadcast(room_id, {
        "event": "tip_updated",
        "tip_percent": tip_percent
    })
    return room


@app.patch("/api/rooms/{room_id}/orders/{order_id}")
async def update_order(room_id: str, order_id: str, order_data: OrderCreate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Room is closed")
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.person_name = order_data.person_name
    order.item = order_data.item
    order.price = order_data.price
    db.add(order)
    db.commit()
    db.refresh(order)
    await manager.broadcast(room_id, {
        "event": "order_updated",
        "order": order.model_dump()
    })
    return order


@app.delete("/api/rooms/{room_id}/orders/{order_id}")
async def delete_order(room_id: str, order_id: str, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Room is closed")
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    await manager.broadcast(room_id, {
        "event": "order_deleted",
        "order_id": order_id
    })
    return {"message": "Order deleted"}

app.mount(
    "/assets",
    StaticFiles(directory="frontend/dist/assets"),
    name="assets"
)

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404)
    return FileResponse("frontend/dist/index.html")
from sqlmodel import Field, Session, SQLModel, create_engine
import uuid

DATABASE_URL = "sqlite:///./orders.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

class Room(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8], primary_key=True)
    name: str
    status: str = Field(default="open")
    tip_percent: float = Field(default=0.0)

class Order(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    room_id: str
    person_name: str
    item: str
    price: float

def create_db():
    SQLModel.metadata.create_all(engine)

def get_db():
    with Session(engine) as session:
        yield session
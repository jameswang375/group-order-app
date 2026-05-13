import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Home() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const [recentRooms, setRecentRooms] = useState([])
  const [recentRoomStatuses, setRecentRoomStatuses] = useState({})

  useEffect(() => {
  loadRecentRooms()
}, [])

  async function createRoom() {
    if (!roomName.trim()) return setError('Please enter a room name')
    try {
      const response = await axios.post(`${API_URL}/rooms?name=${roomName}`)
      navigate(`/room/${response.data.id}`)
    } catch (e) {
      setError('Failed to create room. Is the server running?')
    }
  }

  async function joinRoom() {
    if (!roomId.trim()) return setError('Please enter a room ID')
    try {
      await axios.get(`${API_URL}/rooms/${roomId}`)
      navigate(`/room/${roomId}`)
    } catch (e) {
      setError('Room not found. Check the ID and try again.')
    }
  }

  async function loadRecentRooms() {
  const history = JSON.parse(localStorage.getItem('recentRooms') || '[]')
  setRecentRooms(history)
  const statuses = {}
  await Promise.all(history.map(async (room) => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${room.id}`)
      statuses[room.id] = response.data.room.status
    } catch (e) {
      statuses[room.id] = 'deleted'
    }
  }))
  setRecentRoomStatuses(statuses)
}

function clearHistory() {
  localStorage.removeItem('recentRooms')
  setRecentRooms([])
  setRecentRoomStatuses({})
}

  return (
    <>
      <div className="nav">
        <div className="nav-dot" />
        <div className="nav-title">Ordering Food Together</div>
      </div>

      <div className="page">
        {error && <div className="error">{error}</div>}

        <div className="card">
          <div className="section-label">Create a room</div>
          <input
            type="text"
            placeholder="Room name e.g. Friday Lunch"
            value={roomName}
            onChange={(e) => { setRoomName(e.target.value); setError('') }}
          />
          <button className="primary" onClick={createRoom}>Create room</button>
        </div>

        <div className="card">
          <div className="section-label">Join a room</div>
          <input
            type="text"
            placeholder="Enter room ID"
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); setError('') }}
          />
          <button onClick={joinRoom}>Join room</button>
        </div>

        
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-label">Recent rooms</div>
              <button
                onClick={clearHistory}
                style={{ width: 'auto', padding: '3px 8px', fontSize: '11px', marginBottom: 0, color: '#A32D2D', borderColor: '#f0c0c0', background: '#fff9f9' }}
              >
                Clear history
              </button>
            </div>
            {recentRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => recentRoomStatuses[room.id] !== 'deleted' && navigate(`/room/${room.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: '0.5px solid #f5f5f5',
                  cursor: recentRoomStatuses[room.id] !== 'deleted' ? 'pointer' : 'default'
                }}
              >
                <div style={{ fontSize: '13px', color: recentRoomStatuses[room.id] === 'deleted' ? '#aaa' : '#1a1a1a' }}>
                  {room.name}
                </div>
                <span className={`badge ${recentRoomStatuses[room.id] === 'closed' || recentRoomStatuses[room.id] === 'deleted' ? 'closed' : ''}`}>
                  {recentRoomStatuses[room.id] || '...'}
                </span>
                <div style={{ fontSize: '11px', color: '#aaa', marginLeft: 'auto' }}>
                  {new Date(room.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        
      </div>
    </>
  )
}

export default Home
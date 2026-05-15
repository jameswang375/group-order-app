import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = "/api"

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
    let id = roomId.trim()
    try {
      const url = new URL(id)
      const match = url.pathname.match(/\/room\/([^/]+)/)
      if (match) id = match[1]
    } catch (_) {}
    try {
      await axios.get(`${API_URL}/rooms/${id}`)
      navigate(`/room/${id}`)
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
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button className="primary" onClick={createRoom}>Create room</button>
        </div>

        <div className="card">
          <div className="section-label">Join a room</div>
          <input
            type="text"
            placeholder="Paste room link or ID"
            value={roomId}
            onChange={(e) => { setRoomId(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button onClick={joinRoom}>Join room</button>
        </div>

        {recentRooms.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="section-label">Recent rooms</div>
              <button className="clear-history-btn" onClick={clearHistory}>
                Clear history
              </button>
            </div>
            {recentRooms.map((room) => {
              const status = recentRoomStatuses[room.id]
              const isDeleted = status === 'deleted'
              return (
                <div
                  key={room.id}
                  className={`recent-room-row ${isDeleted ? 'deleted' : ''}`}
                  onClick={() => !isDeleted && navigate(`/room/${room.id}`)}
                >
                  <div className="recent-room-name">{room.name}</div>
                  <span className={`badge ${status === 'closed' || isDeleted ? 'closed' : ''}`}>
                    {status || '…'}
                  </span>
                  <div className="recent-room-date">
                    {new Date(room.timestamp).toLocaleDateString()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

export default Home

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Home() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')

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
      </div>
    </>
  )
}

export default Home
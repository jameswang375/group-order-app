import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = "/api"
const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
const TIP_PRESETS = [0, 15, 18, 20]

function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [orders, setOrders] = useState([])
  const [personName, setPersonName] = useState(localStorage.getItem('personName') || '')
  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [tipPercent, setTipPercent] = useState(0)
  const [editingOrder, setEditingOrder] = useState(null)
  const [splitMode, setSplitMode] = useState('individual')
  const [newOrderIds, setNewOrderIds] = useState(new Set())
  const [showCustomTip, setShowCustomTip] = useState(false)

  useEffect(() => {
    fetchRoom()
    const ws = new WebSocket(`${WS_URL}/ws/${roomId}`)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'new_order') {
        setOrders((prev) => [...prev, data.order])
        const id = data.order.id
        setNewOrderIds((prev) => new Set([...prev, id]))
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }, 600)
      }
      if (data.event === 'room_closed') {
        setRoom((prev) => ({ ...prev, status: 'closed' }))
      }
      if (data.event === 'room_deleted') {
        navigate('/')
      }
      if (data.event === 'tip_updated') {
        setTipPercent(data.tip_percent)
      }
      if (data.event === 'order_updated') {
        setOrders((prev) => prev.map((o) => o.id === data.order.id ? data.order : o))
      }
      if (data.event === 'order_deleted') {
        setOrders((prev) => prev.filter((o) => o.id !== data.order_id))
      }
    }
    return () => ws.close()
  }, [roomId])

  function saveToHistory(roomId, roomName) {
    const history = JSON.parse(localStorage.getItem('recentRooms') || '[]')
    const filtered = history.filter((r) => r.id !== roomId)
    const updated = [{ id: roomId, name: roomName, timestamp: Date.now() }, ...filtered].slice(0, 5)
    localStorage.setItem('recentRooms', JSON.stringify(updated))
  }

  async function fetchRoom() {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}`)
      setRoom(response.data.room)
      setOrders(response.data.orders)
      setTipPercent(response.data.room.tip_percent)
      saveToHistory(response.data.room.id, response.data.room.name)
    } catch (e) {
      setError('Room not found.')
    }
  }

  async function addOrder() {
    if (!personName.trim() || !item.trim() || !price) return setError('Please fill in all fields')
    const parsedPrice = parseFloat(price.replace('$', '').trim())
    if (isNaN(parsedPrice) || parsedPrice <= 0) return setError('Please enter a valid price e.g. 12.99')
    try {
      await axios.post(`${API_URL}/rooms/${roomId}/orders`, {
        person_name: personName,
        item,
        price: parsedPrice,
      })
      localStorage.setItem('personName', personName)
      setItem('')
      setPrice('')
      setError('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add order')
    }
  }

  async function updateTip(value) {
    const parsed = parseFloat(value)
    if (isNaN(parsed) || parsed < 0) return
    setTipPercent(parsed)
    try {
      await axios.patch(`${API_URL}/rooms/${roomId}/tip?tip_percent=${parsed}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update tip')
    }
  }

  async function closeRoom() {
    try {
      await axios.patch(`${API_URL}/rooms/${roomId}/close`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to close room')
    }
  }

  async function deleteRoom() {
    try {
      await axios.delete(`${API_URL}/rooms/${roomId}`)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete room')
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function deleteOrder(orderId) {
    try {
      await axios.delete(`${API_URL}/rooms/${roomId}/orders/${orderId}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete order')
    }
  }

  async function saveEdit() {
    const parsedPrice = parseFloat(editingOrder.price.toString().replace('$', '').trim())
    if (isNaN(parsedPrice) || parsedPrice <= 0) return setError('Please enter a valid price')
    try {
      await axios.patch(`${API_URL}/rooms/${roomId}/orders/${editingOrder.id}`, {
        person_name: editingOrder.person_name,
        item: editingOrder.item,
        price: parsedPrice,
      })
      setEditingOrder(null)
      setError('')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update order')
    }
  }

  const subtotal = orders.reduce((sum, o) => sum + o.price, 0)
  const tipAmount = subtotal * (tipPercent / 100)
  const total = subtotal + tipAmount

  const billByPerson = orders.reduce((acc, order) => {
    if (!acc[order.person_name]) acc[order.person_name] = []
    acc[order.person_name].push(order)
    return acc
  }, {})

  const uniquePeople = Object.keys(billByPerson)
  const peopleCount = uniquePeople.length
  const evenSplit = peopleCount > 0 ? total / peopleCount : 0

  if (!room) return <div className="page">{error || 'Loading...'}</div>

  return (
    <>
      <div className="nav">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="nav-dot" />
        <div className="nav-title">{room.name}</div>
        <span className={`badge ${room.status === 'closed' ? 'closed' : ''}`}>
          {room.status}
        </span>
      </div>

      <div className="page">
        {error && <div className="error">{error}</div>}

        <div className="copy-bar" onClick={copyLink}>
          <span className="copy-icon">🔗</span>
          <span className="copy-id">{window.location.href}</span>
          <span className="copy-label">{copied ? 'Copied!' : 'Copy link'}</span>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <div className="metric-label">Orders</div>
            <div className="metric-value">{orders.length}</div>
          </div>
          <div className="metric">
            <div className="metric-label">People</div>
            <div className="metric-value">{peopleCount}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Total</div>
            <div className="metric-value">${total.toFixed(2)}</div>
          </div>
        </div>

        {room.status === 'open' && (
          <div className="card">
            <div className="section-label">Add your order</div>
            <input
              placeholder="Your name"
              value={personName}
              onChange={(e) => { setPersonName(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && item && price && addOrder()}
            />
            <input
              placeholder="Item"
              value={item}
              onChange={(e) => { setItem(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && price && addOrder()}
            />
            <input
              placeholder="Price e.g. 12.99"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && addOrder()}
            />
            <button className="primary" onClick={addOrder}>Add to order</button>
          </div>
        )}

        {room.status === 'open' && (
          <div className="card">
            <div className="section-label">Tip</div>
            <div className="tip-presets">
              {TIP_PRESETS.map((pct) => (
                <button
                  key={pct}
                  className={`tip-preset-btn ${tipPercent === pct ? 'active' : ''}`}
                  onClick={() => { updateTip(pct); setShowCustomTip(false) }}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
              <button
                className={`tip-preset-btn ${showCustomTip || !TIP_PRESETS.includes(tipPercent) ? 'active' : ''}`}
                onClick={() => setShowCustomTip(true)}
              >
                Custom
              </button>
            </div>
            {(showCustomTip || !TIP_PRESETS.includes(tipPercent)) && (
              <div className="tip-custom-row">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Custom %"
                  value={!TIP_PRESETS.includes(tipPercent) ? tipPercent : ''}
                  onChange={(e) => updateTip(e.target.value)}
                  autoFocus
                />
                <span>{tipPercent > 0 ? `% = $${tipAmount.toFixed(2)}` : '%'}</span>
              </div>
            )}
            {TIP_PRESETS.includes(tipPercent) && tipPercent > 0 && !showCustomTip && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: 2 }}>
                ${tipAmount.toFixed(2)} tip
              </div>
            )}
          </div>
        )}

        {room.status === 'open' && (
          <div className="card danger-zone-card">
            <div className="danger-zone-actions">
              <button onClick={closeRoom}>Close room</button>
              <button className="danger" onClick={deleteRoom}>Delete room</button>
            </div>
          </div>
        )}

        {room.status === 'closed' && (
          <div className="card danger-zone-card">
            <div className="danger-zone-actions">
              <button className="danger" onClick={deleteRoom}>Delete room</button>
            </div>
          </div>
        )}

        <div className="card">
          <div className="section-label">Orders</div>
          {orders.length === 0
            ? <div className="empty">No orders yet — be the first!</div>
            : orders.map((order) => (
              <div key={order.id}>
                {editingOrder?.id === order.id ? (
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f3f3f3' }}>
                    <input
                      value={editingOrder.person_name}
                      onChange={(e) => setEditingOrder({ ...editingOrder, person_name: e.target.value })}
                      placeholder="Your name"
                    />
                    <input
                      value={editingOrder.item}
                      onChange={(e) => setEditingOrder({ ...editingOrder, item: e.target.value })}
                      placeholder="Item"
                    />
                    <input
                      value={editingOrder.price}
                      onChange={(e) => setEditingOrder({ ...editingOrder, price: e.target.value })}
                      placeholder="Price"
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="primary" onClick={saveEdit}>Save</button>
                      <button onClick={() => setEditingOrder(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className={`order-row ${newOrderIds.has(order.id) ? 'entering' : ''}`}>
                    <div>
                      <div className="order-item">{order.item}</div>
                      <div className="order-person">{order.person_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="order-price">${order.price.toFixed(2)}</div>
                      {room.status === 'open' && (
                        <div className="order-actions">
                          <button onClick={() => setEditingOrder({ ...order })}>Edit</button>
                          <button className="danger" onClick={() => deleteOrder(order.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          }
        </div>

        <div className="card">
          <div className="section-label">Bill summary</div>

          <div className="split-toggle">
            <button
              className={splitMode === 'individual' ? 'active' : ''}
              onClick={() => setSplitMode('individual')}
            >
              Pay what you ordered
            </button>
            <button
              className={splitMode === 'even' ? 'active' : ''}
              onClick={() => setSplitMode('even')}
            >
              Split evenly
            </button>
          </div>

          {splitMode === 'individual' ? (
            Object.entries(billByPerson).map(([name, personOrders]) => {
              const personSubtotal = personOrders.reduce((s, o) => s + o.price, 0)
              const personTip = subtotal > 0 ? (personSubtotal / subtotal) * tipAmount : 0
              const personTotal = personSubtotal + personTip
              return (
                <div key={name} className="bill-person">
                  <div className="bill-person-header">
                    <span className="bill-person-name">{name}</span>
                    <span className="bill-person-total">${personTotal.toFixed(2)}</span>
                  </div>
                  <div className="bill-person-items">
                    {personOrders.map((o) => (
                      <div key={o.id} className="bill-item-row">
                        <span>{o.item}</span>
                        <span>${o.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {tipPercent > 0 && (
                      <div className="bill-item-row tip-row">
                        <span>Tip ({tipPercent}%)</span>
                        <span>+${personTip.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            uniquePeople.map((name) => (
              <div key={name} className="summary-row">
                <span>{name}</span>
                <span>${evenSplit.toFixed(2)}</span>
              </div>
            ))
          )}

          {splitMode === 'even' && peopleCount > 0 && (
            <div className="summary-row" style={{ fontSize: '11px', color: '#bbb', marginTop: 4 }}>
              <span>Split evenly among {peopleCount} {peopleCount === 1 ? 'person' : 'people'}</span>
            </div>
          )}

          <hr className="summary-divider" />
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {tipPercent > 0 && (
            <div className="summary-row">
              <span>Tip ({tipPercent}%)</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="summary-total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default Room

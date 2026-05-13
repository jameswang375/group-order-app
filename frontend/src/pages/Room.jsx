import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const WS_URL = API_URL.replace('http', 'ws')

function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [orders, setOrders] = useState([])
  const [personName, setPersonName] = useState('')
  const [item, setItem] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [tipPercent, setTipPercent] = useState(0)
  const [editingOrder, setEditingOrder] = useState(null)
  const [splitMode, setSplitMode] = useState('individual') // 'individual' or 'even'

  useEffect(() => {
    fetchRoom()
    const ws = new WebSocket(`${WS_URL}/ws/${roomId}`)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'new_order') {
        setOrders((prev) => [...prev, data.order])
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

  async function fetchRoom() {
  try {
    const response = await axios.get(`${API_URL}/rooms/${roomId}`)
    setRoom(response.data.room)
    setOrders(response.data.orders)
    setTipPercent(response.data.room.tip_percent)
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
      item: item,
      price: parsedPrice
    })
    setPersonName('')
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
    navigator.clipboard.writeText(roomId)
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
      price: parsedPrice
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

const billSummary = orders.reduce((acc, order) => {
  acc[order.person_name] = (acc[order.person_name] || 0) + order.price
  return acc
}, {})

const uniquePeople = [...new Set(orders.map((o) => o.person_name))]
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
          <span style={{ fontSize: '14px' }}>🔗</span>
          <span className="copy-id">{roomId}</span>
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
            <input placeholder="Your name" value={personName} onChange={(e) => { setPersonName(e.target.value); setError('') }} />
            <input placeholder="Item" value={item} onChange={(e) => { setItem(e.target.value); setError('') }} />
            <input placeholder="Price e.g. 12.99" value={price} onChange={(e) => { setPrice(e.target.value); setError('') }} />
            <button className="primary" onClick={addOrder}>Add to order</button>
            <button onClick={closeRoom}>Close room</button>
            <button className="danger" onClick={deleteRoom}>Delete room</button>
        </div>
        )}

        {room.status === 'open' && (
        <div className="card">
            <div className="section-label">Tip</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
                type="number"
                min="0"
                max="100"
                placeholder="Tip %"
                value={tipPercent}
                onChange={(e) => updateTip(e.target.value)}
                style={{ marginBottom: 0 }}
            />
            <span style={{ fontSize: '14px', color: '#888', whiteSpace: 'nowrap' }}>
                % = ${tipAmount.toFixed(2)}
            </span>
            </div>
        </div>
        )}

        {room.status === 'closed' && (
        <div className="card">
            <button className="danger" onClick={deleteRoom}>Delete room</button>
        </div>
        )}

      <div className="card">
        <div className="section-label">Orders</div>
        {orders.length === 0
            ? <div className="empty">No orders yet</div>
            : orders.map((order) => (
            <div key={order.id}>
                {editingOrder?.id === order.id ? (
                <div style={{ padding: '8px 0', borderBottom: '0.5px solid #f5f5f5' }}>
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
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                    <button className="primary" onClick={saveEdit}>Save</button>
                    <button onClick={() => setEditingOrder(null)}>Cancel</button>
                    </div>
                </div>
                ) : (
                <div className="order-row">
                    <div>
                    <div className="order-item">{order.item}</div>
                    <div className="order-person">{order.person_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="order-price">${order.price.toFixed(2)}</div>
                    {room.status === 'open' && (
                        <>
                        <button
                            onClick={() => setEditingOrder({ ...order })}
                            style={{ width: 'auto', padding: '3px 8px', fontSize: '11px', marginBottom: 0 }}
                        >
                            Edit
                        </button>
                        <button
                            className="danger"
                            onClick={() => deleteOrder(order.id)}
                            style={{ width: 'auto', padding: '3px 8px', fontSize: '11px', marginBottom: 0 }}
                        >
                            Delete
                        </button>
                        </>
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

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
            onClick={() => setSplitMode('individual')}
            style={{
                width: 'auto',
                padding: '4px 12px',
                fontSize: '12px',
                marginBottom: 0,
                background: splitMode === 'individual' ? '#378ADD' : '#fff',
                color: splitMode === 'individual' ? '#fff' : '#1a1a1a',
                borderColor: splitMode === 'individual' ? '#185FA5' : '#e0e0e0'
            }}
            >
            Pay what you ordered
            </button>
            <button
            onClick={() => setSplitMode('even')}
            style={{
                width: 'auto',
                padding: '4px 12px',
                fontSize: '12px',
                marginBottom: 0,
                background: splitMode === 'even' ? '#378ADD' : '#fff',
                color: splitMode === 'even' ? '#fff' : '#1a1a1a',
                borderColor: splitMode === 'even' ? '#185FA5' : '#e0e0e0'
            }}
            >
            Split evenly
            </button>
        </div>

        {splitMode === 'individual' ? (
            <>
            {Object.entries(billSummary).map(([name, personSubtotal]) => {
                const personTip = subtotal > 0 ? (personSubtotal / subtotal) * tipAmount : 0
                const personTotal = personSubtotal + personTip
                return (
                <div key={name}>
                    <div className="summary-row">
                    <span>{name}</span>
                    <span>${personTotal.toFixed(2)}</span>
                    </div>
                    {tipPercent > 0 && (
                    <div className="summary-row" style={{ fontSize: '11px', color: '#aaa' }}>
                        <span style={{ paddingLeft: '8px' }}>subtotal ${personSubtotal.toFixed(2)} + tip ${personTip.toFixed(2)}</span>
                    </div>
                    )}
                </div>
                )
            })}
            </>
        ) : (
            <>
            {uniquePeople.map((name) => (
                <div className="summary-row" key={name}>
                <span>{name}</span>
                <span>${evenSplit.toFixed(2)}</span>
                </div>
            ))}
            <div className="summary-row" style={{ fontSize: '11px', color: '#aaa', marginTop: 4 }}>
                <span>Split evenly among {peopleCount} {peopleCount === 1 ? 'person' : 'people'}</span>
            </div>
            </>
        )}

        <div className="summary-total">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
        </div>
        {tipPercent > 0 && (
            <div className="summary-row" style={{ marginTop: '4px' }}>
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
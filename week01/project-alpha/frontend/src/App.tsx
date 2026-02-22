import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">Ticket Manager</h1>
        <p className="text-muted-foreground mb-8">Project Alpha - Phase 1 Setup Complete</p>
        <div className="card p-6">
          <button onClick={() => setCount((count) => count + 1)}>
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

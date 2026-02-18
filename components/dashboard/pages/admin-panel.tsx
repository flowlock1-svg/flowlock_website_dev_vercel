"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, Trash2, Edit2, Settings, Users, Shield, Gamepad2, Plus, X } from "lucide-react"

const mockUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "Student",
    status: "Active",
    totalFocus: "18.5h",
    class: "10-A",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "Student",
    status: "Active",
    totalFocus: "22.3h",
    class: "10-A",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@example.com",
    role: "Teacher",
    status: "Active",
    totalFocus: "5.2h",
    class: "N/A",
  },
  {
    id: 4,
    name: "Sarah Williams",
    email: "sarah@example.com",
    role: "Student",
    status: "Inactive",
    totalFocus: "12.1h",
    class: "10-B",
  },
  {
    id: 5,
    name: "Tom Brown",
    email: "tom@example.com",
    role: "Admin",
    status: "Active",
    totalFocus: "2.1h",
    class: "N/A",
  },
]

const systemMetrics = [
  { label: "Total Users", value: "245", change: "+12%" },
  { label: "Active Sessions", value: "89", change: "+5%" },
  { label: "System Health", value: "99.8%", change: "✓" },
  { label: "Avg Focus Time", value: "127m", change: "+8%" },
]

const mockGames = [
  { id: 1, name: "Tic Tac Toe", icon: "⭕", desc: "Classic strategy game", enabled: true },
  { id: 2, name: "Sudoku", icon: "🔢", desc: "Logic puzzle game", enabled: true },
  { id: 3, name: "Memory Flip", icon: "🧠", desc: "Test your memory", enabled: true },
]

export function AdminPanel() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState(mockUsers)
  const [games, setGames] = useState(mockGames)
  const [showGameModal, setShowGameModal] = useState(false)
  const [newGame, setNewGame] = useState({ name: "", icon: "", desc: "" })

  const filtered = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const deleteUser = (id: number) => {
    setUsers(users.filter((u) => u.id !== id))
  }

  const addGame = () => {
    if (newGame.name && newGame.icon && newGame.desc) {
      setGames([...games, { id: games.length + 1, ...newGame, enabled: true }])
      setNewGame({ name: "", icon: "", desc: "" })
      setShowGameModal(false)
    }
  }

  const deleteGame = (id: number) => {
    setGames(games.filter((g) => g.id !== id))
  }

  const toggleGameStatus = (id: number) => {
    setGames(games.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)))
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Full system management and control</p>
        </div>
        <Button className="gap-2 w-full md:w-auto">
          <Settings size={18} /> System Settings
        </Button>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric) => (
          <Card key={metric.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-bold mt-2">{metric.value}</p>
              <p className="text-xs text-primary mt-1">{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Games Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Gamepad2 size={24} className="text-primary" />
              Break-Time Games Management
            </h2>
            <p className="text-sm text-muted-foreground">Manage available games for students</p>
          </div>
          <Button onClick={() => setShowGameModal(true)} className="gap-2 w-full md:w-auto">
            <Plus size={18} /> Add Game
          </Button>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card key={game.id} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{game.icon}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleGameStatus(game.id)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                        game.enabled ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {game.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="p-1 hover:bg-destructive/20 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold mb-1">{game.name}</h3>
                <p className="text-xs text-muted-foreground">{game.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Game Modal */}
      {showGameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-card border-border w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Add New Game</CardTitle>
              <button onClick={() => setShowGameModal(false)} className="p-1 hover:bg-muted rounded transition-colors">
                <X size={20} />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Game Name"
                value={newGame.name}
                onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
              />
              <Input
                placeholder="Game Icon (emoji)"
                value={newGame.icon}
                onChange={(e) => setNewGame({ ...newGame, icon: e.target.value })}
                maxLength={2}
              />
              <Input
                placeholder="Game Description"
                value={newGame.desc}
                onChange={(e) => setNewGame({ ...newGame, desc: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addGame} className="flex-1">
                  Add Game
                </Button>
                <Button onClick={() => setShowGameModal(false)} variant="outline" className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Input
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-96"
          />
          <div className="flex gap-2 flex-wrap">
            <Button className="gap-2">
              <Upload size={18} /> Bulk Import
            </Button>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download size={18} /> Export All
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={20} className="text-primary" />
            <CardTitle>User Directory ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Class</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Focus Time</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs md:text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.class}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${user.status === "Active" ? "text-green-500" : "text-muted-foreground"}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{user.totalFocus}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="p-1 hover:bg-muted rounded transition-colors">
                            <Edit2 size={16} className="text-primary" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-1 hover:bg-destructive/20 rounded transition-colors"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Form */}
      <Card className="bg-card border-border">
        <CardHeader className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <CardTitle>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Full Name" />
            <Input placeholder="Email Address" type="email" />
            <select className="px-3 py-2 rounded-lg bg-input border border-border text-foreground">
              <option>Select Role</option>
              <option>Student</option>
              <option>Teacher</option>
              <option>Admin</option>
            </select>
            <Input placeholder="Class/Batch" />
            <Button className="md:col-span-2 bg-primary hover:bg-primary/90">Add User</Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Section */}
      <Card className="bg-card border-border">
        <CardHeader className="flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          <CardTitle>System Health & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Last Backup</p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Active Connections</p>
              <p className="text-sm text-muted-foreground">234 users online</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Security Status</p>
              <p className="text-sm text-green-500">All systems secure</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Database Size</p>
              <p className="text-sm text-muted-foreground">2.3 GB</p>
            </div>
          </div>
          <Button variant="outline" className="w-full bg-transparent">
            Run System Diagnostics
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

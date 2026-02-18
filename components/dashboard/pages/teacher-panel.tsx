"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Users, TrendingUp, Edit2, Eye, BookOpen, Gamepad2, Plus, X, Trash2 } from "lucide-react"

const mockClassData = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    status: "Active",
    avgFocus: "156 min",
    streak: 5,
    performance: 92,
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    status: "Active",
    avgFocus: "189 min",
    streak: 8,
    performance: 95,
  },
  {
    id: 3,
    name: "Alex Wilson",
    email: "alex@example.com",
    status: "Inactive",
    avgFocus: "89 min",
    streak: 2,
    performance: 71,
  },
  {
    id: 4,
    name: "Emma Davis",
    email: "emma@example.com",
    status: "Active",
    avgFocus: "167 min",
    streak: 6,
    performance: 88,
  },
]

const classMetrics = [
  { label: "Total Students", value: "32", change: "+2 new" },
  { label: "Avg Focus Time", value: "162 min", change: "+12 min" },
  { label: "Class Performance", value: "87%", change: "+4%" },
  { label: "Active Today", value: "28/32", change: "87%" },
]

const mockGames = [
  { id: 1, name: "Tic Tac Toe", icon: "⭕", desc: "Classic strategy game", enabled: true },
  { id: 2, name: "Sudoku", icon: "🔢", desc: "Logic puzzle game", enabled: true },
  { id: 3, name: "Memory Flip", icon: "🧠", desc: "Test your memory", enabled: true },
]

export function TeacherPanel() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null)
  const [games, setGames] = useState(mockGames)
  const [showGameModal, setShowGameModal] = useState(false)
  const [newGame, setNewGame] = useState({ name: "", icon: "", desc: "" })

  const filtered = mockClassData.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <h1 className="text-3xl font-bold mb-2">Class Management</h1>
          <p className="text-muted-foreground">Monitor and track your students' progress</p>
        </div>
        <Button className="gap-2 w-full md:w-auto">
          <Download size={18} /> Export Class Report
        </Button>
      </div>

      {/* Class Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {classMetrics.map((metric) => (
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
              Class Break-Time Games
            </h2>
            <p className="text-sm text-muted-foreground">Manage games available for your class</p>
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

      {/* Class Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Class Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Class Name</p>
              <p className="text-xl font-bold mt-1">10-A</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Room</p>
              <p className="text-xl font-bold mt-1">Lab-5</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-xl font-bold mt-1">8:00 - 10:00 AM</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Monitoring Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <Input
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-96"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-transparent">
              <Download size={18} /> Export
            </Button>
          </div>
        </div>

        {/* Students Table */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users size={20} className="text-primary" />
            <CardTitle>Students in Your Class ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Avg Focus</th>
                    <th className="px-4 py-3 text-left font-semibold">Streak</th>
                    <th className="px-4 py-3 text-left font-semibold">Performance</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr key={student.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">{student.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs md:text-sm">{student.email}</td>
                      <td className="px-4 py-3 text-sm">{student.avgFocus}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary">
                          {student.streak} days
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 w-16 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${student.performance}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{student.performance}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${student.status === "Active" ? "text-green-500" : "text-muted-foreground"}`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedStudent(student.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            <Eye size={16} className="text-primary" />
                          </button>
                          <button className="p-1 hover:bg-muted rounded transition-colors">
                            <Edit2 size={16} className="text-primary" />
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

      {/* Class Performance Analytics */}
      <Card className="bg-card border-border">
        <CardHeader className="flex items-center gap-2">
          <TrendingUp size={20} className="text-primary" />
          <CardTitle>Weekly Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => {
            const perf = [72, 85, 91, 78, 94][idx]
            return (
              <div key={day} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{day}</span>
                  <span className="font-semibold">{perf}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${perf}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Teaching Resources */}
      <Card className="bg-card border-border">
        <CardHeader className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <CardTitle>Teaching Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Generate Study Report
            </Button>
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Create Session Plan
            </Button>
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> Send Class Announcement
            </Button>
            <Button variant="outline" className="justify-start bg-transparent gap-2">
              <Download size={18} /> View Resources
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Upload, Trash2, Edit2 } from "lucide-react"

const mockUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Student", status: "Active", totalFocus: "18.5h" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Student", status: "Active", totalFocus: "22.3h" },
  { id: 3, name: "Mike Johnson", email: "mike@example.com", role: "Teacher", status: "Active", totalFocus: "5.2h" },
  {
    id: 4,
    name: "Sarah Williams",
    email: "sarah@example.com",
    role: "Student",
    status: "Inactive",
    totalFocus: "12.1h",
  },
  { id: 5, name: "Tom Brown", email: "tom@example.com", role: "Admin", status: "Active", totalFocus: "2.1h" },
]

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState(mockUsers)

  const filtered = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const deleteUser = (id: number) => {
    setUsers(users.filter((u) => u.id !== id))
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">User Management</h1>
        <p className="text-muted-foreground">Manage students, teachers, and admins</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Input
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-96"
        />
        <div className="flex gap-2">
          <Button className="gap-2">
            <Upload size={18} /> Bulk Import
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download size={18} /> Export
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>All Users ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Focus</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${user.status === "Active" ? "text-green-500" : "text-muted-foreground"}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user.totalFocus}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-muted rounded transition-colors">
                          <Edit2 size={16} className="text-primary" />
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 hover:bg-destructive/20 rounded transition-colors"
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

      {/* Add User Form */}
      <Card className="bg-card border-border">
        <CardHeader>
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
            <Button className="bg-primary hover:bg-primary/90">Add User</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
